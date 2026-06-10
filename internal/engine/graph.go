package engine

import "slices"

// Graph is an undirected simple graph on nodes 0..n-1. Neighbours are kept
// in insertion order (a slice, not a map) because Go randomises map
// iteration order and the engine must be deterministic: every walk over the
// graph has to visit nodes in the same order on every run.
type Graph struct {
	adj   [][]int
	edges int
}

// NewGraph returns an empty graph with n nodes and no edges.
func NewGraph(n int) *Graph {
	return &Graph{adj: make([][]int, n)}
}

// NumNodes returns the number of nodes.
func (g *Graph) NumNodes() int { return len(g.adj) }

// NumEdges returns the number of undirected edges.
func (g *Graph) NumEdges() int { return g.edges }

// AddEdge connects u and v and reports whether the edge was added. Self
// loops and duplicate edges are ignored (reported as false), mirroring how
// networkx's Graph.add_edge treats duplicates as no-ops. Out-of-range nodes
// panic: that is a programmer error, not a runtime condition.
func (g *Graph) AddEdge(u, v int) bool {
	if u == v || g.HasEdge(u, v) {
		return false
	}
	g.adj[u] = append(g.adj[u], v)
	g.adj[v] = append(g.adj[v], u)
	g.edges++
	return true
}

// HasEdge reports whether u and v are connected. Degrees in this model are
// small, so a linear scan beats the bookkeeping of a set per node.
func (g *Graph) HasEdge(u, v int) bool {
	return slices.Contains(g.adj[u], v)
}

// Degree returns the number of neighbours of u.
func (g *Graph) Degree(u int) int { return len(g.adj[u]) }

// Neighbors returns u's neighbours in insertion order. The slice is the
// graph's own storage: callers must not modify it.
func (g *Graph) Neighbors(u int) []int { return g.adj[u] }
