// ────────────────────────────────────────────────────────────
// Algorithm Templates — grouped by category, per language
// ────────────────────────────────────────────────────────────

export type LangKey = "python" | "cpp";

export interface Example {
    label: string;
    group: string;
    code: string;
}

export const EXAMPLES: Record<LangKey, Record<string, Example>> = {
    // ═══════════════════════════════════════════════════════════
    //  PYTHON
    // ═══════════════════════════════════════════════════════════
    python: {
        // ─── Searching ───
        linear_search: {
            group: "Searching",
            label: "Linear Search",
            code: `# Linear Search
nums = [3, 7, 1, 9, 4, 6, 2]
target = 9
result = -1

for i in range(len(nums)):
    if nums[i] == target:
        result = i
        break`,
        },
        binary_search: {
            group: "Searching",
            label: "Binary Search",
            code: `# Rotated Sorted Array Search
def search(nums, target):
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = (left + right) // 2

        if nums[mid] == target:
            return mid

        if nums[left] <= nums[mid]:
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1

    return -1

result = search([4, 5, 6, 7, 0, 1, 2], 0)`,
        },

        // ─── Sorting ───
        bubble_sort: {
            group: "Sorting",
            label: "Bubble Sort",
            code: `# Bubble Sort
nums = [5, 2, 8, 1, 9, 3]

for i in range(len(nums)):
    for j in range(0, len(nums) - i - 1):
        if nums[j] > nums[j + 1]:
            nums[j], nums[j + 1] = nums[j + 1], nums[j]`,
        },
        selection_sort: {
            group: "Sorting",
            label: "Selection Sort",
            code: `# Selection Sort
nums = [64, 25, 12, 22, 11]

for i in range(len(nums)):
    min_idx = i
    for j in range(i + 1, len(nums)):
        if nums[j] < nums[min_idx]:
            min_idx = j
    nums[i], nums[min_idx] = nums[min_idx], nums[i]`,
        },
        insertion_sort: {
            group: "Sorting",
            label: "Insertion Sort",
            code: `# Insertion Sort
nums = [12, 11, 13, 5, 6]

for i in range(1, len(nums)):
    key = nums[i]
    j = i - 1
    while j >= 0 and key < nums[j]:
        nums[j + 1] = nums[j]
        j -= 1
    nums[j + 1] = key`,
        },
        merge_sort: {
            group: "Sorting",
            label: "Merge Sort",
            code: `# Merge Sort
def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    result = []
    i = 0
    j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    while i < len(left):
        result.append(left[i])
        i += 1
    while j < len(right):
        result.append(right[j])
        j += 1
    return result

nums = [38, 27, 43, 3, 9, 82, 10]
sorted_nums = merge_sort(nums)`,
        },
        quick_sort: {
            group: "Sorting",
            label: "Quick Sort",
            code: `# Quick Sort (Lomuto Partition)
def quick_sort(arr, low, high):
    if low < high:
        pivot = arr[high]
        i = low - 1
        for j in range(low, high):
            if arr[j] <= pivot:
                i += 1
                arr[i], arr[j] = arr[j], arr[i]
        arr[i + 1], arr[high] = arr[high], arr[i + 1]
        pi = i + 1
        quick_sort(arr, low, pi - 1)
        quick_sort(arr, pi + 1, high)

nums = [10, 7, 8, 9, 1, 5]
quick_sort(nums, 0, len(nums) - 1)`,
        },
        counting_sort: {
            group: "Sorting",
            label: "Counting Sort",
            code: `# Counting Sort
nums = [4, 2, 2, 8, 3, 3, 1]
max_val = max(nums)
count = [0] * (max_val + 1)

for num in nums:
    count[num] += 1

sorted_nums = []
for i in range(len(count)):
    for j in range(count[i]):
        sorted_nums.append(i)`,
        },

        // ─── Two Pointer / Sliding Window ───
        two_pointer: {
            group: "Two Pointer",
            label: "Two Sum (Sorted)",
            code: `# Two Sum (Sorted Array)
nums = [1, 2, 4, 6, 8, 10, 12]
target = 14

left = 0
right = len(nums) - 1

while left < right:
    current_sum = nums[left] + nums[right]
    if current_sum == target:
        result = [left, right]
        break
    elif current_sum < target:
        left += 1
    else:
        right -= 1`,
        },
        trapping_rain_water: {
            group: "Two Pointer",
            label: "Trapping Rain Water",
            code: `# Trapping Rain Water (Two Pointer)
height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]

left = 0
right = len(height) - 1
left_max = 0
right_max = 0
water = 0

while left < right:
    if height[left] < height[right]:
        if height[left] >= left_max:
            left_max = height[left]
        else:
            water += left_max - height[left]
        left += 1
    else:
        if height[right] >= right_max:
            right_max = height[right]
        else:
            water += right_max - height[right]
        right -= 1`,
        },
        container_most_water: {
            group: "Two Pointer",
            label: "Container With Most Water",
            code: `# Container With Most Water
height = [1, 8, 6, 2, 5, 4, 8, 3, 7]
left = 0
right = len(height) - 1
max_area = 0

while left < right:
    w = right - left
    h = min(height[left], height[right])
    area = w * h
    if area > max_area:
        max_area = area
    if height[left] < height[right]:
        left += 1
    else:
        right -= 1`,
        },
        sliding_window_max: {
            group: "Two Pointer",
            label: "Max Sum Subarray (k)",
            code: `# Maximum Sum Subarray of Size K
nums = [2, 1, 5, 1, 3, 2, 8, 4, 3]
k = 3

window_sum = 0
max_sum = 0

for i in range(len(nums)):
    window_sum += nums[i]
    if i >= k:
        window_sum -= nums[i - k]
    if i >= k - 1:
        if window_sum > max_sum:
            max_sum = window_sum`,
        },
        reverse_array: {
            group: "Two Pointer",
            label: "Reverse Array",
            code: `# Reverse Array In-Place
nums = [1, 2, 3, 4, 5, 6, 7, 8]
left = 0
right = len(nums) - 1

while left < right:
    nums[left], nums[right] = nums[right], nums[left]
    left += 1
    right -= 1`,
        },
        move_zeroes: {
            group: "Two Pointer",
            label: "Move Zeroes",
            code: `# Move Zeroes to End
nums = [0, 1, 0, 3, 12, 0, 5]
j = 0

for i in range(len(nums)):
    if nums[i] != 0:
        nums[j], nums[i] = nums[i], nums[j]
        j += 1`,
        },

        // ─── Dynamic Programming ───
        fibonacci: {
            group: "Dynamic Programming",
            label: "Fibonacci (DP)",
            code: `# Fibonacci — Bottom-Up DP
n = 10
dp = [0] * (n + 1)
dp[1] = 1

for i in range(2, n + 1):
    dp[i] = dp[i - 1] + dp[i - 2]

result = dp[n]`,
        },
        climbing_stairs: {
            group: "Dynamic Programming",
            label: "Climbing Stairs",
            code: `# Climbing Stairs — DP
n = 7
dp = [0] * (n + 1)
dp[0] = 1
dp[1] = 1

for i in range(2, n + 1):
    dp[i] = dp[i - 1] + dp[i - 2]

result = dp[n]`,
        },
        max_subarray: {
            group: "Dynamic Programming",
            label: "Max Subarray (Kadane)",
            code: `# Kadane's Algorithm — Maximum Subarray
nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
max_sum = nums[0]
current = nums[0]

for i in range(1, len(nums)):
    if current < 0:
        current = nums[i]
    else:
        current += nums[i]
    if current > max_sum:
        max_sum = current`,
        },
        coin_change: {
            group: "Dynamic Programming",
            label: "Coin Change",
            code: `# Coin Change — Minimum Coins
coins = [1, 5, 10, 25]
amount = 36
dp = [999999] * (amount + 1)
dp[0] = 0

for i in range(1, amount + 1):
    for coin in coins:
        if coin <= i:
            if dp[i - coin] + 1 < dp[i]:
                dp[i] = dp[i - coin] + 1

result = dp[amount]`,
        },
        longest_increasing_subseq: {
            group: "Dynamic Programming",
            label: "Longest Increasing Subseq",
            code: `# Longest Increasing Subsequence
nums = [10, 9, 2, 5, 3, 7, 101, 18]
dp = [1] * len(nums)

for i in range(1, len(nums)):
    for j in range(i):
        if nums[j] < nums[i]:
            if dp[j] + 1 > dp[i]:
                dp[i] = dp[j] + 1

result = max(dp)`,
        },
        house_robber: {
            group: "Dynamic Programming",
            label: "House Robber",
            code: `# House Robber — DP
nums = [2, 7, 9, 3, 1, 6, 4]
n = len(nums)
dp = [0] * n
dp[0] = nums[0]
dp[1] = max(nums[0], nums[1])

for i in range(2, n):
    dp[i] = max(dp[i - 1], dp[i - 2] + nums[i])

result = dp[n - 1]`,
        },
        knapsack_01: {
            group: "Dynamic Programming",
            label: "0/1 Knapsack",
            code: `# 0/1 Knapsack
weights = [2, 3, 4, 5]
values = [3, 4, 5, 6]
capacity = 8
n = len(weights)

dp = [[0] * (capacity + 1) for _ in range(n + 1)]

for i in range(1, n + 1):
    for w in range(capacity + 1):
        if weights[i - 1] <= w:
            dp[i][w] = max(dp[i - 1][w], dp[i - 1][w - weights[i - 1]] + values[i - 1])
        else:
            dp[i][w] = dp[i - 1][w]

result = dp[n][capacity]`,
        },

        // ─── Graph Algorithms ───
        bfs: {
            group: "Graph",
            label: "BFS (Graph)",
            code: `# Breadth-First Search
graph = {
    0: [1, 2],
    1: [0, 3, 4],
    2: [0, 5],
    3: [1],
    4: [1, 5],
    5: [2, 4]
}

visited = []
queue = [0]

while queue:
    current = queue.pop(0)
    if current not in visited:
        visited.append(current)
        for neighbor in graph[current]:
            if neighbor not in visited:
                queue.append(neighbor)`,
        },
        dfs: {
            group: "Graph",
            label: "DFS (Graph)",
            code: `# Depth-First Search
graph = {
    0: [1, 3],
    1: [0, 2, 4],
    2: [1, 5],
    3: [0, 4],
    4: [1, 3, 5, 6],
    5: [2, 4, 7],
    6: [4, 7],
    7: [5, 6]
}

visited = []
stack = [0]

while stack:
    current = stack.pop()
    if current not in visited:
        visited.append(current)
        for neighbor in graph[current]:
            if neighbor not in visited:
                stack.append(neighbor)`,
        },
        dijkstra: {
            group: "Graph",
            label: "Dijkstra",
            code: `# Dijkstra's Shortest Path
graph = {
    0: [1, 2],
    1: [0, 3, 4],
    2: [0, 4],
    3: [1, 5],
    4: [1, 2, 5],
    5: [3, 4]
}

distances = {0: 0, 1: 999999, 2: 999999, 3: 999999, 4: 999999, 5: 999999}
visited = []
queue = [0]

while queue:
    current = queue.pop(0)
    if current not in visited:
        visited.append(current)
        for neighbor in graph[current]:
            new_dist = distances[current] + 1
            if new_dist < distances[neighbor]:
                distances[neighbor] = new_dist
            if neighbor not in visited:
                queue.append(neighbor)`,
        },
        topological_sort: {
            group: "Graph",
            label: "Topological Sort (Kahn)",
            code: `# Topological Sort (Kahn's Algorithm / BFS)
graph = {
    0: [1, 2],
    1: [3],
    2: [3, 4],
    3: [5],
    4: [5],
    5: []
}

in_degree = {v: 0 for v in graph}
for u in graph:
    for v in graph[u]:
        in_degree[v] += 1

queue = []
for v in in_degree:
    if in_degree[v] == 0:
        queue.append(v)

result = []
while queue:
    current = queue.pop(0)
    result.append(current)
    for neighbor in graph[current]:
        in_degree[neighbor] -= 1
        if in_degree[neighbor] == 0:
            queue.append(neighbor)`,
        },
        cycle_detection: {
            group: "Graph",
            label: "Cycle Detection",
            code: `# Cycle Detection (Undirected Graph via DFS)
graph = {
    0: [1, 2],
    1: [0, 3],
    2: [0, 3],
    3: [1, 2, 4],
    4: [3]
}

visited = []
stack = [(0, -1)]
has_cycle = False

while stack:
    current, parent = stack.pop()
    if current in visited:
        has_cycle = True
        break
    visited.append(current)
    for neighbor in graph[current]:
        if neighbor not in visited:
            stack.append((neighbor, current))
        elif neighbor != parent:
            has_cycle = True`,
        },

        // ─── Backtracking ───
        nqueens: {
            group: "Backtracking",
            label: "N-Queens",
            code: `# N-Queens (4x4)
board = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
]

def is_safe(board, row, col):
    for i in range(col):
        if board[row][i] == 1:
            return False
    r, c = row, col
    while r >= 0 and c >= 0:
        if board[r][c] == 1:
            return False
        r -= 1
        c -= 1
    r, c = row, col
    while r < len(board) and c >= 0:
        if board[r][c] == 1:
            return False
        r += 1
        c -= 1
    return True

def solve(board, col):
    if col >= len(board):
        return True
    for row in range(len(board)):
        if is_safe(board, row, col):
            board[row][col] = 1
            if solve(board, col + 1):
                return True
            board[row][col] = 0
    return False

solve(board, 0)`,
        },
        subsets: {
            group: "Backtracking",
            label: "Generate Subsets",
            code: `# Generate All Subsets (Backtracking)
nums = [1, 2, 3]
result = []
current = []

def backtrack(start):
    result.append(list(current))
    for i in range(start, len(nums)):
        current.append(nums[i])
        backtrack(i + 1)
        current.pop()

backtrack(0)`,
        },
        permutations: {
            group: "Backtracking",
            label: "Permutations",
            code: `# Generate Permutations
nums = [1, 2, 3]
result = []

def permute(start):
    if start == len(nums):
        result.append(list(nums))
        return
    for i in range(start, len(nums)):
        nums[start], nums[i] = nums[i], nums[start]
        permute(start + 1)
        nums[start], nums[i] = nums[i], nums[start]

permute(0)`,
        },

        // ─── Stack & Queue ───
        valid_parentheses: {
            group: "Stack & Queue",
            label: "Valid Parentheses",
            code: `# Valid Parentheses
s = "({[]})()"
stack = []
valid = True

mapping = {')': '(', '}': '{', ']': '['}

for i in range(len(s)):
    char = s[i]
    if char in mapping:
        if not stack or stack[-1] != mapping[char]:
            valid = False
            break
        stack.pop()
    else:
        stack.append(char)

if stack:
    valid = False`,
        },
        next_greater_element: {
            group: "Stack & Queue",
            label: "Next Greater Element",
            code: `# Next Greater Element
nums = [4, 5, 2, 10, 8]
result = [-1] * len(nums)
stack = []

for i in range(len(nums)):
    while stack and nums[stack[-1]] < nums[i]:
        idx = stack.pop()
        result[idx] = nums[i]
    stack.append(i)`,
        },

        // ─── Linked List ───
        reverse_linked_list: {
            group: "Linked List",
            label: "Reverse Linked List",
            code: `# Reverse Linked List
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

# Build: 1 -> 2 -> 3 -> 4 -> 5
head = ListNode(1, ListNode(2, ListNode(3, ListNode(4, ListNode(5)))))

prev = None
current = head

while current is not None:
    next_node = current.next
    current.next = prev
    prev = current
    current = next_node

head = prev`,
        },
        linked_list_insert: {
            group: "Linked List",
            label: "Insert into Linked List",
            code: `# Insert into Linked List
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

# Build: 1 -> 3 -> 5 -> 7
head = ListNode(1, ListNode(3, ListNode(5, ListNode(7))))

# Insert 4 after node with value 3
current = head
while current is not None:
    if current.val == 3:
        new_node = ListNode(4, current.next)
        current.next = new_node
        break
    current = current.next`,
        },
        linked_list_delete: {
            group: "Linked List",
            label: "Delete from Linked List",
            code: `# Delete Node from Linked List
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

# Build: 10 -> 20 -> 30 -> 40 -> 50
head = ListNode(10, ListNode(20, ListNode(30, ListNode(40, ListNode(50)))))

# Delete node with value 30
target = 30
current = head
while current.next is not None:
    if current.next.val == target:
        current.next = current.next.next
        break
    current = current.next`,
        },
        merge_two_lists: {
            group: "Linked List",
            label: "Merge Two Sorted Lists",
            code: `# Merge Two Sorted Linked Lists
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

# List1: 1 -> 3 -> 5
list1 = ListNode(1, ListNode(3, ListNode(5)))
# List2: 2 -> 4 -> 6
list2 = ListNode(2, ListNode(4, ListNode(6)))

dummy = ListNode(0)
current = dummy

while list1 is not None and list2 is not None:
    if list1.val <= list2.val:
        current.next = list1
        list1 = list1.next
    else:
        current.next = list2
        list2 = list2.next
    current = current.next

if list1 is not None:
    current.next = list1
if list2 is not None:
    current.next = list2

merged = dummy.next`,
        },

        // ─── Greedy ───
        activity_selection: {
            group: "Greedy",
            label: "Activity Selection",
            code: `# Activity Selection (Greedy)
starts = [1, 3, 0, 5, 8, 5]
ends =   [2, 4, 6, 7, 9, 9]
n = len(starts)

selected = [0]
last_end = ends[0]

for i in range(1, n):
    if starts[i] >= last_end:
        selected.append(i)
        last_end = ends[i]

count = len(selected)`,
        },

        // ─── Math / Misc ───
        sieve_primes: {
            group: "Math",
            label: "Sieve of Eratosthenes",
            code: `# Sieve of Eratosthenes
n = 30
is_prime = [True] * (n + 1)
is_prime[0] = False
is_prime[1] = False

for i in range(2, int(n**0.5) + 1):
    if is_prime[i]:
        for j in range(i * i, n + 1, i):
            is_prime[j] = False

primes = []
for i in range(n + 1):
    if is_prime[i]:
        primes.append(i)`,
        },
        median_sorted_arrays: {
            group: "Searching",
            label: "Median Sorted Arrays",
            code: `# Median of Two Sorted Arrays
nums1 = [1, 3, 8, 9, 15]
nums2 = [7, 11, 18, 19, 21, 25]

# Binary search on the smaller array
low = 0
high = len(nums1)
n1 = len(nums1)
n2 = len(nums2)

while low <= high:
    cut1 = (low + high) // 2
    cut2 = (n1 + n2 + 1) // 2 - cut1

    left1 = nums1[cut1 - 1] if cut1 > 0 else -999999
    right1 = nums1[cut1] if cut1 < n1 else 999999
    left2 = nums2[cut2 - 1] if cut2 > 0 else -999999
    right2 = nums2[cut2] if cut2 < n2 else 999999

    if left1 <= right2 and left2 <= right1:
        if (n1 + n2) % 2 == 0:
            result = (max(left1, left2) + min(right1, right2)) / 2
        else:
            result = max(left1, left2)
        break
    elif left1 > right2:
        high = cut1 - 1
    else:
        low = cut1 + 1`,
        },
    },

    // ═══════════════════════════════════════════════════════════
    //  C++
    // ═══════════════════════════════════════════════════════════
    cpp: {
        // ─── Searching ───
        linear_search: {
            group: "Searching",
            label: "Linear Search",
            code: `// Linear Search
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {3, 7, 1, 9, 4, 6, 2};
    int target = 9;
    int result = -1;

    for (int i = 0; i < nums.size(); i++) {
        if (nums[i] == target) {
            result = i;
            break;
        }
    }
    return 0;
}`,
        },
        binary_search: {
            group: "Searching",
            label: "Binary Search",
            code: `// Binary Search
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {1, 3, 5, 7, 9, 11, 15, 18};
    int target = 7;
    int left = 0;
    int right = nums.size() - 1;
    int mid = 0;
    int result = -1;

    while (left <= right) {
        mid = (left + right) / 2;
        if (nums[mid] == target) {
            result = mid;
            break;
        } else if (nums[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return 0;
}`,
        },

        // ─── Sorting ───
        bubble_sort: {
            group: "Sorting",
            label: "Bubble Sort",
            code: `// Bubble Sort
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {5, 2, 8, 1, 9, 3};
    int n = nums.size();

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (nums[j] > nums[j + 1]) {
                int temp = nums[j];
                nums[j] = nums[j + 1];
                nums[j + 1] = temp;
            }
        }
    }
    return 0;
}`,
        },
        selection_sort: {
            group: "Sorting",
            label: "Selection Sort",
            code: `// Selection Sort
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {64, 25, 12, 22, 11};
    int n = nums.size();
    int min_idx = 0;

    for (int i = 0; i < n - 1; i++) {
        min_idx = i;
        for (int j = i + 1; j < n; j++) {
            if (nums[j] < nums[min_idx]) {
                min_idx = j;
            }
        }
        int temp = nums[i];
        nums[i] = nums[min_idx];
        nums[min_idx] = temp;
    }
    return 0;
}`,
        },
        insertion_sort: {
            group: "Sorting",
            label: "Insertion Sort",
            code: `// Insertion Sort
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {12, 11, 13, 5, 6};
    int n = nums.size();

    for (int i = 1; i < n; i++) {
        int key = nums[i];
        int j = i - 1;
        while (j >= 0 && nums[j] > key) {
            nums[j + 1] = nums[j];
            j = j - 1;
        }
        nums[j + 1] = key;
    }
    return 0;
}`,
        },
        counting_sort: {
            group: "Sorting",
            label: "Counting Sort",
            code: `// Counting Sort
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {4, 2, 2, 8, 3, 3, 1};
    int max_val = 8;
    vector<int> count(max_val + 1, 0);

    for (int i = 0; i < nums.size(); i++) {
        count[nums[i]]++;
    }

    vector<int> sorted_nums;
    for (int i = 0; i <= max_val; i++) {
        for (int j = 0; j < count[i]; j++) {
            sorted_nums.push_back(i);
        }
    }
    return 0;
}`,
        },

        // ─── Two Pointer ───
        two_pointer: {
            group: "Two Pointer",
            label: "Two Sum (Sorted)",
            code: `// Two Sum (Sorted Array)
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {1, 2, 4, 6, 8, 10, 12};
    int target = 14;
    int left = 0;
    int right = nums.size() - 1;
    int current_sum = 0;

    while (left < right) {
        current_sum = nums[left] + nums[right];
        if (current_sum == target) {
            break;
        } else if (current_sum < target) {
            left = left + 1;
        } else {
            right = right - 1;
        }
    }
    return 0;
}`,
        },
        reverse_array: {
            group: "Two Pointer",
            label: "Reverse Array",
            code: `// Reverse Array In-Place
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {1, 2, 3, 4, 5, 6, 7, 8};
    int left = 0;
    int right = nums.size() - 1;

    while (left < right) {
        int temp = nums[left];
        nums[left] = nums[right];
        nums[right] = temp;
        left++;
        right--;
    }
    return 0;
}`,
        },
        move_zeroes: {
            group: "Two Pointer",
            label: "Move Zeroes",
            code: `// Move Zeroes to End
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {0, 1, 0, 3, 12, 0, 5};
    int j = 0;

    for (int i = 0; i < nums.size(); i++) {
        if (nums[i] != 0) {
            int temp = nums[j];
            nums[j] = nums[i];
            nums[i] = temp;
            j++;
        }
    }
    return 0;
}`,
        },
        container_most_water: {
            group: "Two Pointer",
            label: "Container With Most Water",
            code: `// Container With Most Water
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> height = {1, 8, 6, 2, 5, 4, 8, 3, 7};
    int left = 0;
    int right = height.size() - 1;
    int max_area = 0;

    while (left < right) {
        int w = right - left;
        int h = min(height[left], height[right]);
        int area = w * h;
        if (area > max_area) {
            max_area = area;
        }
        if (height[left] < height[right]) {
            left++;
        } else {
            right--;
        }
    }
    return 0;
}`,
        },

        // ─── Dynamic Programming ───
        fibonacci: {
            group: "Dynamic Programming",
            label: "Fibonacci (DP)",
            code: `// Fibonacci — Bottom-Up DP
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n = 10;
    vector<int> dp(n + 1, 0);
    dp[1] = 1;

    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    int result = dp[n];
    return 0;
}`,
        },
        climbing_stairs: {
            group: "Dynamic Programming",
            label: "Climbing Stairs",
            code: `// Climbing Stairs — DP
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n = 7;
    vector<int> dp(n + 1, 0);
    dp[0] = 1;
    dp[1] = 1;

    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    int result = dp[n];
    return 0;
}`,
        },
        max_subarray: {
            group: "Dynamic Programming",
            label: "Max Subarray (Kadane)",
            code: `// Kadane's Algorithm — Maximum Subarray
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
    int max_sum = nums[0];
    int current = nums[0];

    for (int i = 1; i < nums.size(); i++) {
        if (current < 0) {
            current = nums[i];
        } else {
            current += nums[i];
        }
        if (current > max_sum) {
            max_sum = current;
        }
    }
    return 0;
}`,
        },
        coin_change: {
            group: "Dynamic Programming",
            label: "Coin Change",
            code: `// Coin Change — Minimum Coins
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> coins = {1, 5, 10, 25};
    int amount = 36;
    vector<int> dp(amount + 1, 999999);
    dp[0] = 0;

    for (int i = 1; i <= amount; i++) {
        for (int j = 0; j < coins.size(); j++) {
            if (coins[j] <= i) {
                if (dp[i - coins[j]] + 1 < dp[i]) {
                    dp[i] = dp[i - coins[j]] + 1;
                }
            }
        }
    }
    int result = dp[amount];
    return 0;
}`,
        },
        longest_increasing_subseq: {
            group: "Dynamic Programming",
            label: "Longest Increasing Subseq",
            code: `// Longest Increasing Subsequence
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {10, 9, 2, 5, 3, 7, 101, 18};
    int n = nums.size();
    vector<int> dp(n, 1);

    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) {
                if (dp[j] + 1 > dp[i]) {
                    dp[i] = dp[j] + 1;
                }
            }
        }
    }

    int result = 0;
    for (int i = 0; i < n; i++) {
        if (dp[i] > result) result = dp[i];
    }
    return 0;
}`,
        },
        house_robber: {
            group: "Dynamic Programming",
            label: "House Robber",
            code: `// House Robber — DP
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {2, 7, 9, 3, 1, 6, 4};
    int n = nums.size();
    vector<int> dp(n, 0);
    dp[0] = nums[0];
    dp[1] = max(nums[0], nums[1]);

    for (int i = 2; i < n; i++) {
        dp[i] = max(dp[i - 1], dp[i - 2] + nums[i]);
    }
    int result = dp[n - 1];
    return 0;
}`,
        },

        // ─── Stack & Queue ───
        valid_parentheses: {
            group: "Stack & Queue",
            label: "Valid Parentheses",
            code: `// Valid Parentheses
#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    string s = "({[]})()";
    vector<char> stack;
    bool valid = true;

    for (int i = 0; i < s.size(); i++) {
        char c = s[i];
        if (c == '(' || c == '{' || c == '[') {
            stack.push_back(c);
        } else {
            if (stack.empty()) { valid = false; break; }
            char top = stack.back();
            stack.pop_back();
            if ((c == ')' && top != '(') ||
                (c == '}' && top != '{') ||
                (c == ']' && top != '[')) {
                valid = false;
                break;
            }
        }
    }
    if (!stack.empty()) valid = false;
    return 0;
}`,
        },
        next_greater_element: {
            group: "Stack & Queue",
            label: "Next Greater Element",
            code: `// Next Greater Element
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {4, 5, 2, 10, 8};
    int n = nums.size();
    vector<int> result(n, -1);
    vector<int> stack;

    for (int i = 0; i < n; i++) {
        while (!stack.empty() && nums[stack.back()] < nums[i]) {
            result[stack.back()] = nums[i];
            stack.pop_back();
        }
        stack.push_back(i);
    }
    return 0;
}`,
        },

        // ─── Math ───
        sieve_primes: {
            group: "Math",
            label: "Sieve of Eratosthenes",
            code: `// Sieve of Eratosthenes
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n = 30;
    vector<bool> is_prime(n + 1, true);
    is_prime[0] = false;
    is_prime[1] = false;

    for (int i = 2; i * i <= n; i++) {
        if (is_prime[i]) {
            for (int j = i * i; j <= n; j += i) {
                is_prime[j] = false;
            }
        }
    }

    vector<int> primes;
    for (int i = 0; i <= n; i++) {
        if (is_prime[i]) primes.push_back(i);
    }
    return 0;
}`,
        },
    },
};

export const DEFAULT_LANG: LangKey = "python";
export const DEFAULT_EXAMPLE = "binary_search";

