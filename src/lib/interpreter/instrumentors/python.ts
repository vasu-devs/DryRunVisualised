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

def __serialize_tree__(node, max_depth=10):
    """Serialize a binary tree to {"__type__": "tree", "root": {...}}."""
    if node is None or max_depth <= 0:
        return None
    return {
        "v": __get_node_val__(node),
        "l": __serialize_tree__(getattr(node, 'left', None), max_depth - 1),
        "r": __serialize_tree__(getattr(node, 'right', None), max_depth - 1),
    }

def __safe_serialize__(val, depth=0):
    if depth > 8:
        return str(val)
    try:
        # Linked list node
        if __is_linked_list_node__(val) and not __is_tree_node__(val):
            return __serialize_linked_list__(val)
        # Tree node
        if __is_tree_node__(val):
            return {"__type__": "tree", "root": __serialize_tree__(val)}
        # Convert sets to sorted lists
        if isinstance(val, set):
            return sorted(list(val), key=lambda x: str(x))
        if isinstance(val, frozenset):
            return sorted(list(val), key=lambda x: str(x))
        # Standard JSON-serializable
        json.dumps(val)
        return val
    except (TypeError, ValueError, OverflowError):
        # Try to serialize as dict of attributes
        if hasattr(val, '__dict__'):
            result = {}
            for k, v in val.__dict__.items():
                if not k.startswith('_'):
                    result[k] = __safe_serialize__(v, depth + 1)
            return result
        return str(val)

__trace_step_count__ = [0]
__MAX_TRACE_STEPS__ = 500

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
    sys.stdout = sys.__stdout__
`;
    return wrapper.trim();
};

