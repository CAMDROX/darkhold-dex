package engine

const (
	red   = true
	black = false
)

// RBNode represents a node in a Red-Black Tree
type RBNode struct {
	Key    int64 // price in cents
	Value  *PriceLevel
	Left   *RBNode
	Right  *RBNode
	Parent *RBNode
	Color  bool
}

// RBTree is a self-balancing binary search tree for price levels
type RBTree struct {
	Root  *RBNode
	count int
	min   *RBNode
	max   *RBNode
}

// NewRBTree initializes a new Red-Black Tree
func NewRBTree() *RBTree {
	return &RBTree{}
}

// Len returns total price levels in the tree
func (t *RBTree) Len() int {
	return t.count
}

// Min returns the node with the minimum price (cheapest ask)
func (t *RBTree) Min() *RBNode {
	if t.Root == nil {
		return nil
	}
	if t.min != nil {
		return t.min
	}
	n := t.Root
	for n.Left != nil {
		n = n.Left
	}
	t.min = n
	return n
}

// Max returns the node with the maximum price (highest bid)
func (t *RBTree) Max() *RBNode {
	if t.Root == nil {
		return nil
	}
	if t.max != nil {
		return t.max
	}
	n := t.Root
	for n.Right != nil {
		n = n.Right
	}
	t.max = n
	return n
}

// Find returns the PriceLevel for a given price in cents, or nil if absent
func (t *RBTree) Find(key int64) *PriceLevel {
	n := t.Root
	for n != nil {
		if key == n.Key {
			return n.Value
		} else if key < n.Key {
			n = n.Left
		} else {
			n = n.Right
		}
	}
	return nil
}

// Insert adds or updates a price level in the Red-Black Tree
func (t *RBTree) Insert(key int64, value *PriceLevel) {
	t.min = nil
	t.max = nil

	if t.Root == nil {
		t.Root = &RBNode{Key: key, Value: value, Color: black}
		t.count = 1
		return
	}

	var parent *RBNode
	curr := t.Root
	for curr != nil {
		parent = curr
		if key == curr.Key {
			curr.Value = value
			return
		} else if key < curr.Key {
			curr = curr.Left
		} else {
			curr = curr.Right
		}
	}

	newNode := &RBNode{
		Key:    key,
		Value:  value,
		Parent: parent,
		Color:  red,
	}

	if key < parent.Key {
		parent.Left = newNode
	} else {
		parent.Right = newNode
	}
	t.count++

	t.insertFixup(newNode)
}

func (t *RBTree) insertFixup(z *RBNode) {
	for z.Parent != nil && z.Parent.Color == red {
		if z.Parent == z.Parent.Parent.Left {
			y := z.Parent.Parent.Right // Uncle
			if y != nil && y.Color == red {
				z.Parent.Color = black
				y.Color = black
				z.Parent.Parent.Color = red
				z = z.Parent.Parent
			} else {
				if z == z.Parent.Right {
					z = z.Parent
					t.leftRotate(z)
				}
				z.Parent.Color = black
				z.Parent.Parent.Color = red
				t.rightRotate(z.Parent.Parent)
			}
		} else {
			y := z.Parent.Parent.Left // Uncle
			if y != nil && y.Color == red {
				z.Parent.Color = black
				y.Color = black
				z.Parent.Parent.Color = red
				z = z.Parent.Parent
			} else {
				if z == z.Parent.Left {
					z = z.Parent
					t.rightRotate(z)
				}
				z.Parent.Color = black
				z.Parent.Parent.Color = red
				t.leftRotate(z.Parent.Parent)
			}
		}
		if z == t.Root {
			break
		}
	}
	t.Root.Color = black
}

// Delete removes a price level from the tree
func (t *RBTree) Delete(key int64) bool {
	z := t.Root
	for z != nil && z.Key != key {
		if key < z.Key {
			z = z.Left
		} else {
			z = z.Right
		}
	}
	if z == nil {
		return false
	}

	t.min = nil
	t.max = nil
	t.count--

	var y *RBNode
	var x *RBNode
	var xParent *RBNode

	if z.Left == nil || z.Right == nil {
		y = z
	} else {
		// Successor
		y = z.Right
		for y.Left != nil {
			y = y.Left
		}
	}

	if y.Left != nil {
		x = y.Left
	} else {
		x = y.Right
	}

	if x != nil {
		x.Parent = y.Parent
	}
	xParent = y.Parent

	if y.Parent == nil {
		t.Root = x
	} else if y == y.Parent.Left {
		y.Parent.Left = x
	} else {
		y.Parent.Right = x
	}

	origColor := y.Color
	if y != z {
		z.Key = y.Key
		z.Value = y.Value
	}

	if origColor == black {
		t.deleteFixup(x, xParent)
	}

	return true
}

func (t *RBTree) deleteFixup(x, xParent *RBNode) {
	for (x == nil || x.Color == black) && x != t.Root {
		if x == xParent.Left {
			w := xParent.Right
			if w != nil && w.Color == red {
				w.Color = black
				xParent.Color = red
				t.leftRotate(xParent)
				w = xParent.Right
			}
			if w == nil {
				x = xParent
				xParent = x.Parent
				continue
			}
			leftBlack := w.Left == nil || w.Left.Color == black
			rightBlack := w.Right == nil || w.Right.Color == black
			if leftBlack && rightBlack {
				w.Color = red
				x = xParent
				xParent = x.Parent
			} else {
				if rightBlack {
					if w.Left != nil {
						w.Left.Color = black
					}
					w.Color = red
					t.rightRotate(w)
					w = xParent.Right
				}
				w.Color = xParent.Color
				xParent.Color = black
				if w.Right != nil {
					w.Right.Color = black
				}
				t.leftRotate(xParent)
				x = t.Root
				break
			}
		} else {
			w := xParent.Left
			if w != nil && w.Color == red {
				w.Color = black
				xParent.Color = red
				t.rightRotate(xParent)
				w = xParent.Left
			}
			if w == nil {
				x = xParent
				xParent = x.Parent
				continue
			}
			leftBlack := w.Left == nil || w.Left.Color == black
			rightBlack := w.Right == nil || w.Right.Color == black
			if leftBlack && rightBlack {
				w.Color = red
				x = xParent
				xParent = x.Parent
			} else {
				if leftBlack {
					if w.Right != nil {
						w.Right.Color = black
					}
					w.Color = red
					t.leftRotate(w)
					w = xParent.Left
				}
				w.Color = xParent.Color
				xParent.Color = black
				if w.Left != nil {
					w.Left.Color = black
				}
				t.rightRotate(xParent)
				x = t.Root
				break
			}
		}
	}
	if x != nil {
		x.Color = black
	}
}

func (t *RBTree) leftRotate(x *RBNode) {
	y := x.Right
	if y == nil {
		return
	}
	x.Right = y.Left
	if y.Left != nil {
		y.Left.Parent = x
	}
	y.Parent = x.Parent
	if x.Parent == nil {
		t.Root = y
	} else if x == x.Parent.Left {
		x.Parent.Left = y
	} else {
		x.Parent.Right = y
	}
	y.Left = x
	x.Parent = y
}

func (t *RBTree) rightRotate(y *RBNode) {
	x := y.Left
	if x == nil {
		return
	}
	y.Left = x.Right
	if x.Right != nil {
		x.Right.Parent = y
	}
	x.Parent = y.Parent
	if y.Parent == nil {
		t.Root = x
	} else if y == y.Parent.Right {
		y.Parent.Right = x
	} else {
		y.Parent.Left = x
	}
	x.Right = y
	y.Parent = x
}

// Ascending returns up to `limit` price levels sorted lowest to highest (for Asks)
func (t *RBTree) Ascending(limit int) []*PriceLevel {
	res := make([]*PriceLevel, 0, limit)
	var inorder func(n *RBNode)
	inorder = func(n *RBNode) {
		if n == nil || len(res) >= limit {
			return
		}
		inorder(n.Left)
		if len(res) < limit {
			res = append(res, n.Value)
		}
		inorder(n.Right)
	}
	inorder(t.Root)
	return res
}

// Descending returns up to `limit` price levels sorted highest to lowest (for Bids)
func (t *RBTree) Descending(limit int) []*PriceLevel {
	res := make([]*PriceLevel, 0, limit)
	var reverseInorder func(n *RBNode)
	reverseInorder = func(n *RBNode) {
		if n == nil || len(res) >= limit {
			return
		}
		reverseInorder(n.Right)
		if len(res) < limit {
			res = append(res, n.Value)
		}
		reverseInorder(n.Left)
	}
	reverseInorder(t.Root)
	return res
}
