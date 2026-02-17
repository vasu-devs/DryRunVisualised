/**
 * Python Instrumentor
 * 
 * Injects a tracing function using sys.settrace to capture state
 * at every line execution.
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

def __safe_serialize__(val):
    try:
        json.dumps(val)
        return val
    except (TypeError, ValueError, OverflowError):
        return str(val)

def __trace_func__(frame, event, arg):
    __INTERNAL_VARS__ = {"sys", "json", "io", "copy", "stdout_capture", "types"}
    if event == "line" and frame.f_code.co_filename == "<string>":
        try:
            stack = {}
            for k, v in frame.f_locals.items():
                if not k.startswith("__") and k not in __INTERNAL_VARS__ and not callable(v) and not str(type(v)).startswith("<class 'module"):
                    try:
                        stack[k] = copy.deepcopy(v)
                    except Exception:
                        stack[k] = str(v)
            
            safe_stack = {k: __safe_serialize__(v) for k, v in stack.items()}
            
            state = {
                "line": frame.f_lineno,
                "stack": safe_stack,
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
