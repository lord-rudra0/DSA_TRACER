import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Link } from 'react-router-dom';

// Hard-coded Top Interview 150 list grouped by sections exactly in the order supplied by the user.
// Each problem shows a "Solution" tag, a difficulty badge, and a Solved/Unsolved toggle.
// Status is persisted to localStorage under key `top150_status` as an object { [title]: 'solved'|'unsolved' }.

const STORAGE_KEY = 'top150_status';

const SECTIONS = [
  {
    title: 'Array / String',
    problems: [
      ['Merge Sorted Array', 'Easy'],
      ['Remove Element', 'Easy'],
      ['Remove Duplicates from Sorted Array', 'Easy'],
      ['Remove Duplicates from Sorted Array II', 'Medium'],
      ['Majority Element', 'Easy'],
      ['Rotate Array', 'Medium'],
      ['Best Time to Buy and Sell Stock', 'Easy'],
      ['Best Time to Buy and Sell Stock II', 'Medium'],
      ['Jump Game', 'Medium'],
      ['Jump Game II', 'Medium'],
      ['H-Index', 'Medium'],
      ['Insert Delete GetRandom O(1)', 'Medium'],
      ['Product of Array Except Self', 'Medium'],
      ['Gas Station', 'Medium'],
      ['Candy', 'Hard'],
      ['Trapping Rain Water', 'Hard'],
      ['Roman to Integer', 'Easy'],
      ['Integer to Roman', 'Medium'],
      ['Length of Last Word', 'Easy'],
      ['Longest Common Prefix', 'Easy'],
      ['Reverse Words in a String', 'Medium'],
      ['Zigzag Conversion', 'Medium'],
      ['Find the Index of the First Occurrence in a String', 'Easy'],
      ['Text Justification', 'Hard']
    ]
  },
  {
    title: 'Two Pointers',
    problems: [
      ['Valid Palindrome', 'Easy'],
      ['Is Subsequence', 'Easy'],
      ['Two Sum II - Input Array Is Sorted', 'Medium'],
      ['Container With Most Water', 'Medium'],
      ['3Sum', 'Medium']
    ]
  },
  {
    title: 'Sliding Window',
    problems: [
      ['Minimum Size Subarray Sum', 'Medium'],
      ['Longest Substring Without Repeating Characters', 'Medium'],
      ['Substring with Concatenation of All Words', 'Hard'],
      ['Minimum Window Substring', 'Hard']
    ]
  },
  {
    title: 'Matrix',
    problems: [
      ['Valid Sudoku', 'Medium'],
      ['Spiral Matrix', 'Medium'],
      ['Rotate Image', 'Medium'],
      ['Set Matrix Zeroes', 'Medium'],
      ['Game of Life', 'Medium']
    ]
  },
  {
    title: 'Hashmap',
    problems: [
      ['Ransom Note', 'Easy'],
      ['Isomorphic Strings', 'Easy'],
      ['Word Pattern', 'Easy'],
      ['Valid Anagram', 'Easy'],
      ['Group Anagrams', 'Medium'],
      ['Two Sum', 'Easy'],
      ['Happy Number', 'Easy'],
      ['Contains Duplicate II', 'Easy'],
      ['Longest Consecutive Sequence', 'Medium']
    ]
  },
  {
    title: 'Intervals',
    problems: [
      ['Summary Ranges', 'Easy'],
      ['Merge Intervals', 'Medium'],
      ['Insert Interval', 'Medium'],
      ['Minimum Number of Arrows to Burst Balloons', 'Medium']
    ]
  },
  {
    title: 'Stack',
    problems: [
      ['Valid Parentheses', 'Easy'],
      ['Simplify Path', 'Medium'],
      ['Min Stack', 'Medium'],
      ['Evaluate Reverse Polish Notation', 'Medium'],
      ['Basic Calculator', 'Hard']
    ]
  },
  {
    title: 'Linked List',
    problems: [
      ['Linked List Cycle', 'Easy'],
      ['Add Two Numbers', 'Medium'],
      ['Merge Two Sorted Lists', 'Easy'],
      ['Copy List with Random Pointer', 'Medium'],
      ['Reverse Linked List II', 'Medium'],
      ['Reverse Nodes in k-Group', 'Hard'],
      ['Remove Nth Node From End of List', 'Medium'],
      ['Remove Duplicates from Sorted List II', 'Medium'],
      ['Rotate List', 'Medium'],
      ['Partition List', 'Medium'],
      ['LRU Cache', 'Medium']
    ]
  },
  {
    title: 'Binary Tree General',
    problems: [
      ['Maximum Depth of Binary Tree', 'Easy'],
      ['Same Tree', 'Easy'],
      ['Invert Binary Tree', 'Easy'],
      ['Symmetric Tree', 'Easy'],
      ['Construct Binary Tree from Preorder and Inorder Traversal', 'Medium'],
      ['Construct Binary Tree from Inorder and Postorder Traversal', 'Medium'],
      ['Populating Next Right Pointers in Each Node II', 'Medium'],
      ['Flatten Binary Tree to Linked List', 'Medium'],
      ['Path Sum', 'Easy'],
      ['Sum Root to Leaf Numbers', 'Medium'],
      ['Binary Tree Maximum Path Sum', 'Hard'],
      ['Binary Search Tree Iterator', 'Medium'],
      ['Count Complete Tree Nodes', 'Easy'],
      ['Lowest Common Ancestor of a Binary Tree', 'Medium']
    ]
  },
  {
    title: 'Binary Tree BFS',
    problems: [
      ['Binary Tree Right Side View', 'Medium'],
      ['Average of Levels in Binary Tree', 'Easy'],
      ['Binary Tree Level Order Traversal', 'Medium'],
      ['Binary Tree Zigzag Level Order Traversal', 'Medium']
    ]
  },
  {
    title: 'Binary Search Tree',
    problems: [
      ['Minimum Absolute Difference in BST', 'Easy'],
      ['Kth Smallest Element in a BST', 'Medium'],
      ['Validate Binary Search Tree', 'Medium']
    ]
  },
  {
    title: 'Graph General',
    problems: [
      ['Number of Islands', 'Medium'],
      ['Surrounded Regions', 'Medium'],
      ['Clone Graph', 'Medium'],
      ['Evaluate Division', 'Medium'],
      ['Course Schedule', 'Medium'],
      ['Course Schedule II', 'Medium']
    ]
  },
  {
    title: 'Graph BFS',
    problems: [
      ['Snakes and Ladders', 'Medium'],
      ['Minimum Genetic Mutation', 'Medium'],
      ['Word Ladder', 'Hard']
    ]
  },
  {
    title: 'Trie',
    problems: [
      ['Implement Trie (Prefix Tree)', 'Medium'],
      ['Design Add and Search Words Data Structure', 'Medium'],
      ['Word Search II', 'Hard']
    ]
  },
  {
    title: 'Backtracking',
    problems: [
      ['Letter Combinations of a Phone Number', 'Medium'],
      ['Combinations', 'Medium'],
      ['Permutations', 'Medium'],
      ['Combination Sum', 'Medium'],
      ['N-Queens II', 'Hard'],
      ['Generate Parentheses', 'Medium'],
      ['Word Search', 'Medium']
    ]
  },
  {
    title: 'Divide & Conquer',
    problems: [
      ['Convert Sorted Array to Binary Search Tree', 'Easy'],
      ['Sort List', 'Medium'],
      ['Construct Quad Tree', 'Medium'],
      ['Merge k Sorted Lists', 'Hard']
    ]
  },
  {
    title: "Kadane's Algorithm",
    problems: [
      ['Maximum Subarray', 'Medium'],
      ['Maximum Sum Circular Subarray', 'Medium']
    ]
  },
  {
    title: 'Binary Search',
    problems: [
      ['Search Insert Position', 'Easy'],
      ['Search a 2D Matrix', 'Medium'],
      ['Find Peak Element', 'Medium'],
      ['Search in Rotated Sorted Array', 'Medium'],
      ['Find First and Last Position of Element in Sorted Array', 'Medium'],
      ['Find Minimum in Rotated Sorted Array', 'Medium'],
      ['Median of Two Sorted Arrays', 'Hard']
    ]
  },
  {
    title: 'Heap',
    problems: [
      ['Kth Largest Element in an Array', 'Medium'],
      ['IPO', 'Hard'],
      ['Find K Pairs with Smallest Sums', 'Medium'],
      ['Find Median from Data Stream', 'Hard']
    ]
  },
  {
    title: 'Bit Manipulation',
    problems: [
      ['Add Binary', 'Easy'],
      ['Reverse Bits', 'Easy'],
      ['Number of 1 Bits', 'Easy'],
      ['Single Number', 'Easy'],
      ['Single Number II', 'Medium'],
      ['Bitwise AND of Numbers Range', 'Medium']
    ]
  },
  {
    title: 'Math',
    problems: [
      ['Palindrome Number', 'Easy'],
      ['Plus One', 'Easy'],
      ['Factorial Trailing Zeroes', 'Medium'],
      ['Sqrt(x)', 'Easy'],
      ['Pow(x, n)', 'Medium'],
      ['Max Points on a Line', 'Hard']
    ]
  },
  {
    title: '1D DP',
    problems: [
      ['Climbing Stairs', 'Easy'],
      ['House Robber', 'Medium'],
      ['Word Break', 'Medium'],
      ['Coin Change', 'Medium'],
      ['Longest Increasing Subsequence', 'Medium']
    ]
  },
  {
    title: 'Multidimensional DP',
    problems: [
      ['Triangle', 'Medium'],
      ['Minimum Path Sum', 'Medium'],
      ['Unique Paths II', 'Medium'],
      ['Longest Palindromic Substring', 'Medium'],
      ['Interleaving String', 'Medium'],
      ['Edit Distance', 'Medium'],
      ['Best Time to Buy and Sell Stock III', 'Hard'],
      ['Best Time to Buy and Sell Stock IV', 'Hard'],
      ['Maximal Square', 'Medium']
    ]
  }
];

function TopInterview() {
  const { user, loading: authLoading } = useAuth();

  const [statusMap, setStatusMap] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });

  const [serverSolved, setServerSolved] = useState(new Set());

  // simple slugify that matches LeetCode titleSlug conventions approximately
  const slugify = (title) => {
    return title
      .toLowerCase()
      .replace(/[()'".,]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(statusMap));
    } catch (e) {
      // ignore storage errors
    }
  }, [statusMap]);

  // Fetch solved slugs from backend when authenticated
  useEffect(() => {
    let mounted = true;
    const fetchSolved = async () => {
      if (!user) return;
      try {
        const resp = await axios.get('/users/solved');
        if (!mounted) return;
        const solvedArr = Array.isArray(resp.data?.solved) ? resp.data.solved : [];
        setServerSolved(new Set(solvedArr));
      } catch (e) {
        // ignore, server may not be running or user not synced
        console.warn('Could not fetch solved problems:', e?.message || e);
      }
    };
    if (!authLoading) fetchSolved();
    return () => { mounted = false; };
  }, [user, authLoading]);

  const toggleStatus = (title) => {
    setStatusMap((prev) => {
      const next = { ...prev };
      next[title] = next[title] === 'solved' ? 'unsolved' : 'solved';
      return next;
    });
  };

  // Precompute global sequential numbering across all sections
  let counter = 1;
  const numberedSections = SECTIONS.map((section) => {
    const problems = section.problems.map(([title, difficulty]) => {
      const idx = counter++;
      return { title, difficulty, idx };
    });
    return { title: section.title, problems };
  });

  // Compute solved counts and XP
  const allProblemsFlat = numberedSections.flatMap(s => s.problems);
  const totalCount = allProblemsFlat.length;
  const solvedOnServerCount = allProblemsFlat.filter(p => serverSolved.has(slugify(p.title))).length;
  const solvedLocalCount = Object.keys(statusMap).filter(t => statusMap[t] === 'solved').length;
  const solvedCount = Math.max(solvedOnServerCount, solvedLocalCount);

  const xpForDifficulty = (d) => {
    if (d === 'Easy') return 10;
    if (d === 'Medium') return 20;
    return 30;
  };

  const xpFromSolved = allProblemsFlat.reduce((acc, p) => {
    const slug = slugify(p.title);
    const isSolved = serverSolved.has(slug) || statusMap[p.title] === 'solved';
    return acc + (isSolved ? xpForDifficulty(p.difficulty) : 0);
  }, 0);

  const renderBadge = (difficulty) => {
    const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
    if (difficulty === 'Easy') return <span className={`${base} bg-green-50 text-green-700`}>Easy</span>;
    if (difficulty === 'Medium') return <span className={`${base} bg-yellow-50 text-yellow-700`}>Medium</span>;
    return <span className={`${base} bg-red-50 text-red-700`}>Hard</span>;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Top Interview 150</h1>

      <div className="mb-6 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center gap-6">
        <div>
          <div className="text-sm text-gray-500">Solved</div>
          <div className="text-lg font-semibold">{solvedCount} / {totalCount}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">XP (this list)</div>
          <div className="text-lg font-semibold">+{xpFromSolved}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Your XP</div>
          <div className="text-lg font-semibold">{user?.xp ?? '—'}</div>
        </div>
        <div className="ml-auto text-sm text-gray-400">Server-synced shown first</div>
      </div>

      {numberedSections.map((section) => (
        <section key={section.title} className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {section.problems.map(({ title, difficulty, idx }) => {
                        // Determine status: server-solved takes precedence, otherwise user toggles
                        const slug = slugify(title);
                        const isSolvedOnServer = serverSolved.has(slug);
                        const status = isSolvedOnServer ? 'solved' : (statusMap[title] || 'unsolved');
              return (
                <div
                  key={title}
                  className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      <span className="inline-block w-7 font-mono text-primary-600">{idx}.</span>{' '}
                      {/** external LeetCode link opens in new tab (title clickable) */}
                      <a
                        href={`https://leetcode.com/problems/${slugify(title)}/`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {title}
                      </a>
                      {/** explicit external icon as well */}
                      <a
                        href={`https://leetcode.com/problems/${slugify(title)}/`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="ml-2 text-xs text-blue-500 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ↗
                      </a>
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">Solution</span>
                      {renderBadge(difficulty)}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={() => toggleStatus(title)}
                      className={
                        'px-3 py-1 text-xs rounded font-medium ' +
                        (status === 'solved'
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200')
                      }
                    >
                      {status === 'solved' ? 'Solved' : 'Unsolved'}
                    </button>
                    <span className="text-xs text-gray-500">{difficulty}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default TopInterview;


