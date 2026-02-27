/**
 * Python Instrumentor
 * 
 * Injects a tracing function using sys.settrace to capture state
 * at every line execution. Supports linked list nodes, tree nodes,
 * __slots__-based classes, and other custom objects.
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
    """Check if obj looks like a linked list node (has val/value/key + next/nextNode/next_node)."""
    if obj is None or isinstance(obj, (int, float, str, bool, list, dict, tuple, set)):
        return False
    has_next = hasattr(obj, 'next') or hasattr(obj, 'nextNode') or hasattr(obj, 'next_node')
    has_val = hasattr(obj, 'val') or hasattr(obj, 'value') or hasattr(obj, 'data') or hasattr(obj, 'key')
    return has_next and has_val

def __is_tree_node__(obj):
    """Check if obj looks like a binary tree node (has val/value/key + left/right variants)."""
    if obj is None or isinstance(obj, (int, float, str, bool, list, dict, tuple, set)):
        return False
    has_left = hasattr(obj, 'left') or hasattr(obj, 'left_child') or hasattr(obj, 'leftChild')
    has_right = hasattr(obj, 'right') or hasattr(obj, 'right_child') or hasattr(obj, 'rightChild')
    has_val = hasattr(obj, 'val') or hasattr(obj, 'value') or hasattr(obj, 'data') or hasattr(obj, 'key')
    return has_left and has_right and has_val

def __get_node_val__(obj):
    """Get the value from a node object."""
    if hasattr(obj, 'val'): return obj.val
    if hasattr(obj, 'value'): return obj.value
    if hasattr(obj, 'key'): return obj.key
    if hasattr(obj, 'data'): return obj.data
    return str(obj)

def __get_next_ptr__(obj):
    """Get the 'next' pointer from a linked list node."""
    if hasattr(obj, 'next'): return obj.next
    if hasattr(obj, 'nextNode'): return obj.nextNode
    if hasattr(obj, 'next_node'): return obj.next_node
    return None

def __get_left_child__(obj):
    """Get the left child from a tree node."""
    if hasattr(obj, 'left'): return obj.left
    if hasattr(obj, 'left_child'): return obj.left_child
    if hasattr(obj, 'leftChild'): return obj.leftChild
    return None

def __get_right_child__(obj):
    """Get the right child from a tree node."""
    if hasattr(obj, 'right'): return obj.right
    if hasattr(obj, 'right_child'): return obj.right_child
    if hasattr(obj, 'rightChild'): return obj.rightChild
    return None

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
        current = __get_next_ptr__(current)
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
        "l": __serialize_tree__(__get_left_child__(node), max_depth - 1, seen),
        "r": __serialize_tree__(__get_right_child__(node), max_depth - 1, seen),
    }
    seen.discard(node_id)
    return result

def __clamp_number__(val):
    """Clamp large numbers to prevent 3D scene explosion."""
    if isinstance(val, float):
        if val != val:  # NaN
            return 0
        if val == float('inf'):
            return 999999999
        if val == float('-inf'):
            return -999999999
    if isinstance(val, (int, float)) and abs(val) > 1e9:
        return 999999999 if val > 0 else -999999999
    return val

def __safe_serialize__(val, depth=0, seen=None):
    if seen is None:
        seen = set()
        
    if depth > 10:
        return "<Max Depth Reached>"
        
    val_id = id(val)
    if val_id in seen:
        return {"__ref__": val_id}
        
    # Primitives that are directly JSON serializable
    if val is None or isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return __clamp_number__(val)
    if isinstance(val, str):
        return val

    # Add complex objects to seen before recursing
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
            seen.discard(val_id)
            return __serialize_linked_list__(val)
            
        # Tree node heuristic
        if __is_tree_node__(val):
            seen.discard(val_id)
            return {"__type__": "tree", "root": __serialize_tree__(val)}

        # Try default JSON serialization
        json.dumps(val)
        return val
        
    except (TypeError, ValueError, OverflowError):
        pass

    # Custom Class Instances — support both __dict__ and __slots__
    attrs = {}
    if hasattr(val, '__dict__'):
        attrs = val.__dict__
    elif hasattr(val, '__slots__'):
        for slot in val.__slots__:
            if not slot.startswith('_'):
                try:
                    attrs[slot] = getattr(val, slot)
                except AttributeError:
                    pass
    
    if attrs:
        result = {"__id__": val_id, "__cls__": type(val).__name__}
        for k, v in attrs.items():
            if not k.startswith('_'):
                result[k] = __safe_serialize__(v, depth + 1, seen)
        return result
        
    return str(val)

__trace_step_count__ = [0]
__trace_truncated__ = [False]
__MAX_TRACE_STEPS__ = 1000

def __trace_func__(frame, event, arg):
    __INTERNAL_VARS__ = {"sys", "json", "io", "copy", "stdout_capture", "types"}
    if event == "line" and frame.f_code.co_filename == "<string>":
        if __trace_step_count__[0] >= __MAX_TRACE_STEPS__:
            if not __trace_truncated__[0]:
                __trace_truncated__[0] = True
                print("__TRACE_TRUNCATED__", file=sys.__stdout__)
            return __trace_func__
        __trace_step_count__[0] += 1
        try:
            stack = {}
            # Merge globals first (user-defined only), then locals override
            if frame.f_globals:
                for k, v in frame.f_globals.items():
                    if not k.startswith("__") and k not in __INTERNAL_VARS__ and not callable(v) and not str(type(v)).startswith("<class 'module") and not isinstance(v, type):
                        stack[k] = __safe_serialize__(v)
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


__user_globals__ = {"__name__": "__main__"}

try:
    exec(compile(__user_code__, "<string>", "exec"), __user_globals__)
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

