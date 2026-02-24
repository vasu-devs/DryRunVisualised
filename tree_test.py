class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def invertTree(root):
    if not root:
        return None
    
    # Swap children
    root.left, root.right = root.right, root.left
    
    invertTree(root.left)
    invertTree(root.right)
    return root

# Building a nice tree
root = TreeNode(4)
root.left = TreeNode(2)
root.right = TreeNode(7)
root.left.left = TreeNode(1)
root.left.right = TreeNode(3)
root.right.left = TreeNode(6)
root.right.right = TreeNode(9)

# A simple DP grid and array to test dynamic layout stacking!
dp = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
visited = [1, 2, 3, 4]

invertTree(root)
