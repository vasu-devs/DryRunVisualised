from collections import deque

class AhoNode:
    def __init__(self, char=''):
        self.char = char
        self.children = {}
        self.fail = None
        self.output = []

def build_aho_corasick(words):
    root = AhoNode('ROOT')
    
    # 1. Build Trie
    for word in words:
        node = root
        for char in word:
            if char not in node.children:
                node.children[char] = AhoNode(char)
            node = node.children[char]
        node.output.append(word)
        
    # 2. Build Failure Links
    queue = deque()
    for char, child in root.children.items():
        child.fail = root
        queue.append(child)
        
    while queue:
        current = queue.popleft()
        for char, child in current.children.items():
            queue.append(child)
            fail_node = current.fail
            while fail_node and char not in fail_node.children:
                fail_node = fail_node.fail
            
            if fail_node:
                child.fail = fail_node.children[char]
            else:
                child.fail = root
                
            child.output.extend(child.fail.output)
    return root

words1 = ["he", "she"]
root1 = build_aho_corasick(words1)
