/**
 * Python Instrumentor
 * 
 * Injects a tracing function using sys.settrace to capture state
 * at every line execution. Now supports linked list nodes, tree nodes,
 * and other custom objects.
 */

export const instrumentPython = (userCode: string): string => {
    // Escape backslashes, then triple-quotes inside user code
    const escapedCode = userCode
        .replace(/\\/g, '\\\\')
        .replace(/"""/g, '\\"\\"\\"');

    const wrapper = `
import sys
import json
import io
import copy

# Setup stdout capture
stdout_capture = io.StringIO()
sys.stdout = stdout_capture

__user_code__ = """${escapedCode}"""

def __is_linked_list_node__(obj):
    """Check if obj looks like a linked list node (has val/value/key + next)."""
    if obj is None or isinstance(obj, (int, float, str, bool, list, dict, tuple, set)):
        return False
    return (hasattr(obj, 'next') and
            (hasattr(obj, 'val') or hasattr(obj, 'value') or hasattr(obj, 'data') or hasattr(obj, 'key')))

def __is_tree_node__(obj):
    """Check if obj looks like a binary tree node (has val/value/key + left/right)."""
    if obj is None or isinstance(obj, (int, float, str, bool, list, dict, tuple, set)):
        return False
    return (hasattr(obj, 'left') and hasattr(obj, 'right') and
            (hasattr(obj, 'val') or hasattr(obj, 'value') or hasattr(obj, 'data') or hasattr(obj, 'key')))

def __get_node_val__(obj):
    """Get the value from a node object."""
    if hasattr(obj, 'val'): return obj.val
    if hasattr(obj, 'value'): return obj.value
    if hasattr(obj, 'key'): return obj.key
    if hasattr(obj, 'data'): return obj.data
    return str(obj)

def __serialize_linked_list__(head, max_nodes=100):
    """Walk a linked list and return {"__type__": "linked_list", "values": [...]}."""
    values = []
    current = head
    seen = set()
    while current is not None and len(values) < max_nodes:
        node_id = id(current)
        if node_id in seen:
            break  # Cycle detected
        seen.add(node_id)
        values.append(__get_node_val__(current))
        current = getattr(current, 'next', None)
    return {"__type__": "linked_list", "values": values}

def __serialize_tree__(node, max_depth=15, seen=None):
    """Serialize a binary tree to {"__type__": "tree", "root": {...}}.
    Uses a 'seen' set for cycle detection (handles Morris traversal threading)."""
    if seen is None:
        seen = set()
    if node is None or max_depth <= 0:
        return None
    node_id = id(node)
    if node_id in seen:
        return None  # Cycle detected (Morris threading) — stop here
    seen.add(node_id)
    result = {
        "v": __get_node_val__(node),
        "id": node_id,
        "l": __serialize_tree__(getattr(node, 'left', None), max_depth - 1, seen),
        "r": __serialize_tree__(getattr(node, 'right', None), max_depth - 1, seen),
    }
    seen.discard(node_id)
    return result

def __safe_serialize__(val, depth=0, seen=None):
    if seen is None:
        seen = set()
        
    if depth > 10:
        return "<Max Depth Reached>"
        
    val_id = id(val)
    if val_id in seen:
        return {"__ref__": val_id}
        
    # Primitives that are directly JSON serializable
    if val is None or isinstance(val, (int, float, str, bool)):
        return val

    # Add complex objects to seen before recursing
    if not isinstance(val, (int, float, str, bool)):
        seen.add(val_id)

    try:
        # Lists and Tuples
        if isinstance(val, (list, tuple)):
            return [__safe_serialize__(v, depth + 1, seen) for v in val]
            
        # Sets
        if isinstance(val, (set, frozenset)):
            return [__safe_serialize__(v, depth + 1, seen) for v in sorted(list(val), key=lambda x: str(x))]
            
        # Built-in Dicts
        if isinstance(val, dict):
            return {str(k): __safe_serialize__(v, depth + 1, seen) for k, v in val.items()}

        # Linked list node heuristic
        if __is_linked_list_node__(val) and not __is_tree_node__(val):
            seen.remove(val_id)
            return __serialize_linked_list__(val)
            
        # Tree node heuristic
        if __is_tree_node__(val):
            seen.remove(val_id)
            return {"__type__": "tree", "root": __serialize_tree__(val)}

        # Try default JSON serialization
        json.dumps(val)
        return val
        
    except (TypeError, ValueError, OverflowError):
        pass

    # Custom Class Instances
    if hasattr(val, '__dict__'):
        result = {"__id__": val_id, "__cls__": type(val).__name__}
        for k, v in val.__dict__.items():
            if not k.startswith('_'):
                result[k] = __safe_serialize__(v, depth + 1, seen)
        return result
        
    return str(val)

__trace_step_count__ = [0]
__MAX_TRACE_STEPS__ = 1000

def __trace_func__(frame, event, arg):
    __INTERNAL_VARS__ = {"sys", "json", "io", "copy", "stdout_capture", "types"}
    if event == "line" and frame.f_code.co_filename == "<string>":
        if __trace_step_count__[0] >= __MAX_TRACE_STEPS__:
            return __trace_func__
        __trace_step_count__[0] += 1
        try:
            stack = {}
            for k, v in frame.f_locals.items():
                if not k.startswith("__") and k not in __INTERNAL_VARS__ and not callable(v) and not str(type(v)).startswith("<class 'module") and not isinstance(v, type):
                    stack[k] = __safe_serialize__(v)
            
            state = {
                "line": frame.f_lineno,
                "stack": stack,
                "heap": {},
                "stdout": stdout_capture.getvalue()
            }
            print(f"__TRACE__{json.dumps(state)}", file=sys.__stdout__)
        except Exception:
            pass
    return __trace_func__

sys.settrace(__trace_func__)

try:
    exec(compile(__user_code__, "<string>", "exec"))
except Exception as e:
    print(f"__ERROR__{str(e)}", file=sys.__stdout__)
finally:
    sys.settrace(None)
    try:
        sys.stdout = sys.__stdout__
    except Exception:
        pass
`;
    return wrapper.trim();
};

