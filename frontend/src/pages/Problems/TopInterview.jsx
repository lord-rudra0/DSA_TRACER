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
      ['Merge Sorted Array', 'Easy', 'merge-sorted-array'],
      ['Remove Element', 'Easy', 'remove-element'],
      ['Remove Duplicates from Sorted Array', 'Easy', 'remove-duplicates-from-sorted-array'],
      ['Remove Duplicates from Sorted Array II', 'Medium', 'remove-duplicates-from-sorted-array-ii'],
      ['Majority Element', 'Easy', 'majority-element'],
      ['Rotate Array', 'Medium', 'rotate-array'],
      ['Best Time to Buy and Sell Stock', 'Easy', 'best-time-to-buy-and-sell-stock'],
      ['Best Time to Buy and Sell Stock II', 'Medium', 'best-time-to-buy-and-sell-stock-ii'],
      ['Jump Game', 'Medium', 'jump-game'],
      ['Jump Game II', 'Medium', 'jump-game-ii'],
      ['H-Index', 'Medium', 'h-index'],
      ['Insert Delete GetRandom O(1)', 'Medium', 'insert-delete-getrandom-o1'],
      ['Product of Array Except Self', 'Medium', 'product-of-array-except-self'],
      ['Gas Station', 'Medium', 'gas-station'],
      ['Candy', 'Hard', 'candy'],
      ['Trapping Rain Water', 'Hard', 'trapping-rain-water'],
      ['Roman to Integer', 'Easy', 'roman-to-integer'],
      ['Integer to Roman', 'Medium', 'integer-to-roman'],
      ['Length of Last Word', 'Easy', 'length-of-last-word'],
      ['Longest Common Prefix', 'Easy', 'longest-common-prefix'],
      ['Reverse Words in a String', 'Medium', 'reverse-words-in-a-string'],
      ['Zigzag Conversion', 'Medium', 'zigzag-conversion'],
      ['Find the Index of the First Occurrence in a String', 'Easy', 'find-the-index-of-the-first-occurrence-in-a-string'],
      ['Text Justification', 'Hard', 'text-justification']
    ]
  },
  {
    title: 'Two Pointers',
    problems: [
      ['Valid Palindrome', 'Easy', 'valid-palindrome'],
      ['Is Subsequence', 'Easy', 'is-subsequence'],
      ['Two Sum II - Input Array Is Sorted', 'Medium', 'two-sum-ii-input-array-is-sorted'],
      ['Container With Most Water', 'Medium', 'container-with-most-water'],
      ['3Sum', 'Medium', '3sum']
    ]
  },
  {
    title: 'Sliding Window',
    problems: [
      ['Minimum Size Subarray Sum', 'Medium', 'minimum-size-subarray-sum'],
      ['Longest Substring Without Repeating Characters', 'Medium', 'longest-substring-without-repeating-characters'],
      ['Substring with Concatenation of All Words', 'Hard', 'substring-with-concatenation-of-all-words'],
      ['Minimum Window Substring', 'Hard', 'minimum-window-substring']
    ]
  },
  {
    title: 'Matrix',
    problems: [
      ['Valid Sudoku', 'Medium', 'valid-sudoku'],
      ['Spiral Matrix', 'Medium', 'spiral-matrix'],
      ['Rotate Image', 'Medium', 'rotate-image'],
      ['Set Matrix Zeroes', 'Medium', 'set-matrix-zeroes'],
      ['Game of Life', 'Medium', 'game-of-life']
    ]
  },
  {
    title: 'Hashmap',
    problems: [
      ['Ransom Note', 'Easy', 'ransom-note'],
      ['Isomorphic Strings', 'Easy', 'isomorphic-strings'],
      ['Word Pattern', 'Easy', 'word-pattern'],
      ['Valid Anagram', 'Easy', 'valid-anagram'],
      ['Group Anagrams', 'Medium', 'group-anagrams'],
      ['Two Sum', 'Easy', 'two-sum'],
      ['Happy Number', 'Easy', 'happy-number'],
      ['Contains Duplicate II', 'Easy', 'contains-duplicate-ii'],
      ['Longest Consecutive Sequence', 'Medium', 'longest-consecutive-sequence']
    ]
  },
  {
    title: 'Intervals',
    problems: [
      ['Summary Ranges', 'Easy', 'summary-ranges'],
      ['Merge Intervals', 'Medium', 'merge-intervals'],
      ['Insert Interval', 'Medium', 'insert-interval'],
      ['Minimum Number of Arrows to Burst Balloons', 'Medium', 'minimum-number-of-arrows-to-burst-balloons']
    ]
  },
  {
    title: 'Stack',
    problems: [
      ['Valid Parentheses', 'Easy', 'valid-parentheses'],
      ['Simplify Path', 'Medium', 'simplify-path'],
      ['Min Stack', 'Medium', 'min-stack'],
      ['Evaluate Reverse Polish Notation', 'Medium', 'evaluate-reverse-polish-notation'],
      ['Basic Calculator', 'Hard', 'basic-calculator']
    ]
  },
  {
    title: 'Linked List',
    problems: [
      ['Linked List Cycle', 'Easy', 'linked-list-cycle'],
      ['Add Two Numbers', 'Medium', 'add-two-numbers'],
      ['Merge Two Sorted Lists', 'Easy', 'merge-two-sorted-lists'],
      ['Copy List with Random Pointer', 'Medium', 'copy-list-with-random-pointer'],
      ['Reverse Linked List II', 'Medium', 'reverse-linked-list-ii'],
      ['Reverse Nodes in k-Group', 'Hard', 'reverse-nodes-in-k-group'],
      ['Remove Nth Node From End of List', 'Medium', 'remove-nth-node-from-end-of-list'],
      ['Remove Duplicates from Sorted List II', 'Medium', 'remove-duplicates-from-sorted-list-ii'],
      ['Rotate List', 'Medium', 'rotate-list'],
      ['Partition List', 'Medium', 'partition-list'],
      ['LRU Cache', 'Medium', 'lru-cache']
    ]
  },
  {
    title: 'Binary Tree General',
    problems: [
      ['Maximum Depth of Binary Tree', 'Easy', 'maximum-depth-of-binary-tree'],
      ['Same Tree', 'Easy', 'same-tree'],
      ['Invert Binary Tree', 'Easy', 'invert-binary-tree'],
      ['Symmetric Tree', 'Easy', 'symmetric-tree'],
      ['Construct Binary Tree from Preorder and Inorder Traversal', 'Medium', 'construct-binary-tree-from-preorder-and-inorder-traversal'],
      ['Construct Binary Tree from Inorder and Postorder Traversal', 'Medium', 'construct-binary-tree-from-inorder-and-postorder-traversal'],
      ['Populating Next Right Pointers in Each Node II', 'Medium', 'populating-next-right-pointers-in-each-node-ii'],
      ['Flatten Binary Tree to Linked List', 'Medium', 'flatten-binary-tree-to-linked-list'],
      ['Path Sum', 'Easy', 'path-sum'],
      ['Sum Root to Leaf Numbers', 'Medium', 'sum-root-to-leaf-numbers'],
      ['Binary Tree Maximum Path Sum', 'Hard', 'binary-tree-maximum-path-sum'],
      ['Binary Search Tree Iterator', 'Medium', 'binary-search-tree-iterator'],
      ['Count Complete Tree Nodes', 'Easy', 'count-complete-tree-nodes'],
      ['Lowest Common Ancestor of a Binary Tree', 'Medium', 'lowest-common-ancestor-of-a-binary-tree']
    ]
  },
  {
    title: 'Binary Tree BFS',
    problems: [
      ['Binary Tree Right Side View', 'Medium', 'binary-tree-right-side-view'],
      ['Average of Levels in Binary Tree', 'Easy', 'average-of-levels-in-binary-tree'],
      ['Binary Tree Level Order Traversal', 'Medium', 'binary-tree-level-order-traversal'],
      ['Binary Tree Zigzag Level Order Traversal', 'Medium', 'binary-tree-zigzag-level-order-traversal']
    ]
  },
  {
    title: 'Binary Search Tree',
    problems: [
      ['Minimum Absolute Difference in BST', 'Easy', 'minimum-absolute-difference-in-bst'],
      ['Kth Smallest Element in a BST', 'Medium', 'kth-smallest-element-in-a-bst'],
      ['Validate Binary Search Tree', 'Medium', 'validate-binary-search-tree']
    ]
  },
  {
    title: 'Graph General',
    problems: [
      ['Number of Islands', 'Medium', 'number-of-islands'],
      ['Surrounded Regions', 'Medium', 'surrounded-regions'],
      ['Clone Graph', 'Medium', 'clone-graph'],
      ['Evaluate Division', 'Medium', 'evaluate-division'],
      ['Course Schedule', 'Medium', 'course-schedule'],
      ['Course Schedule II', 'Medium', 'course-schedule-ii']
    ]
  },
  {
    title: 'Graph BFS',
    problems: [
      ['Snakes and Ladders', 'Medium', 'snakes-and-ladders'],
      ['Minimum Genetic Mutation', 'Medium', 'minimum-genetic-mutation'],
      ['Word Ladder', 'Hard', 'word-ladder']
    ]
  },
  {
    title: 'Trie',
    problems: [
      ['Implement Trie (Prefix Tree)', 'Medium', 'implement-trie-prefix-tree'],
      ['Design Add and Search Words Data Structure', 'Medium', 'design-add-and-search-words-data-structure'],
      ['Word Search II', 'Hard', 'word-search-ii']
    ]
  },
  {
    title: 'Backtracking',
    problems: [
      ['Letter Combinations of a Phone Number', 'Medium', 'letter-combinations-of-a-phone-number'],
      ['Combinations', 'Medium', 'combinations'],
      ['Permutations', 'Medium', 'permutations'],
      ['Combination Sum', 'Medium', 'combination-sum'],
      ['N-Queens II', 'Hard', 'n-queens-ii'],
      ['Generate Parentheses', 'Medium', 'generate-parentheses'],
      ['Word Search', 'Medium', 'word-search']
    ]
  },
  {
    title: 'Divide & Conquer',
    problems: [
      ['Convert Sorted Array to Binary Search Tree', 'Easy', 'convert-sorted-array-to-binary-search-tree'],
      ['Sort List', 'Medium', 'sort-list'],
      ['Construct Quad Tree', 'Medium', 'construct-quad-tree'],
      ['Merge k Sorted Lists', 'Hard', 'merge-k-sorted-lists']
    ]
  },
  {
    title: "Kadane's Algorithm",
    problems: [
      ['Maximum Subarray', 'Medium', 'maximum-subarray'],
      ['Maximum Sum Circular Subarray', 'Medium', 'maximum-sum-circular-subarray']
    ]
  },
  {
    title: 'Binary Search',
    problems: [
      ['Search Insert Position', 'Easy', 'search-insert-position'],
      ['Search a 2D Matrix', 'Medium', 'search-a-2d-matrix'],
      ['Find Peak Element', 'Medium', 'find-peak-element'],
      ['Search in Rotated Sorted Array', 'Medium', 'search-in-rotated-sorted-array'],
      ['Find First and Last Position of Element in Sorted Array', 'Medium', 'find-first-and-last-position-of-element-in-sorted-array'],
      ['Find Minimum in Rotated Sorted Array', 'Medium', 'find-minimum-in-rotated-sorted-array'],
      ['Median of Two Sorted Arrays', 'Hard', 'median-of-two-sorted-arrays']
    ]
  },
  {
    title: 'Heap',
    problems: [
      ['Kth Largest Element in an Array', 'Medium', 'kth-largest-element-in-an-array'],
      ['IPO', 'Hard', 'ipo'],
      ['Find K Pairs with Smallest Sums', 'Medium', 'find-k-pairs-with-smallest-sums'],
      ['Find Median from Data Stream', 'Hard', 'find-median-from-data-stream']
    ]
  },
  {
    title: 'Bit Manipulation',
    problems: [
      ['Add Binary', 'Easy', 'add-binary'],
      ['Reverse Bits', 'Easy', 'reverse-bits'],
      ['Number of 1 Bits', 'Easy', 'number-of-1-bits'],
      ['Single Number', 'Easy', 'single-number'],
      ['Single Number II', 'Medium', 'single-number-ii'],
      ['Bitwise AND of Numbers Range', 'Medium', 'bitwise-and-of-numbers-range']
    ]
  },
  {
    title: 'Math',
    problems: [
      ['Palindrome Number', 'Easy', 'palindrome-number'],
      ['Plus One', 'Easy', 'plus-one'],
      ['Factorial Trailing Zeroes', 'Medium', 'factorial-trailing-zeroes'],
      ['Sqrt(x)', 'Easy', 'sqrtx'],
      ['Pow(x, n)', 'Medium', 'powx-n'],
      ['Max Points on a Line', 'Hard', 'max-points-on-a-line']
    ]
  },
  {
    title: '1D DP',
    problems: [
      ['Climbing Stairs', 'Easy', 'climbing-stairs'],
      ['House Robber', 'Medium', 'house-robber'],
      ['Word Break', 'Medium', 'word-break'],
      ['Coin Change', 'Medium', 'coin-change'],
      ['Longest Increasing Subsequence', 'Medium', 'longest-increasing-subsequence']
    ]
  },
  {
    title: 'Multidimensional DP',
    problems: [
      ['Triangle', 'Medium', 'triangle'],
      ['Minimum Path Sum', 'Medium', 'minimum-path-sum'],
      ['Unique Paths II', 'Medium', 'unique-paths-ii'],
      ['Longest Palindromic Substring', 'Medium', 'longest-palindromic-substring'],
      ['Interleaving String', 'Medium', 'interleaving-string'],
      ['Edit Distance', 'Medium', 'edit-distance'],
      ['Best Time to Buy and Sell Stock III', 'Hard', 'best-time-to-buy-and-sell-stock-iii'],
      ['Best Time to Buy and Sell Stock IV', 'Hard', 'best-time-to-buy-and-sell-stock-iv'],
      ['Maximal Square', 'Medium', 'maximal-square']
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
    const problems = section.problems.map(([title, difficulty, titleSlug]) => {
      const idx = counter++;
      return { title, difficulty, idx, titleSlug };
    });
    return { title: section.title, problems };
  });

  // Compute solved counts and XP
  const allProblemsFlat = numberedSections.flatMap(s => s.problems);
  const totalCount = allProblemsFlat.length;
  const solvedOnServerCount = allProblemsFlat.filter(p => {
    const slug = p.titleSlug || slugify(p.title);
    return serverSolved.has(slug);
  }).length;
  const solvedLocalCount = Object.keys(statusMap).filter(t => statusMap[t] === 'solved').length;
  const solvedCount = Math.max(solvedOnServerCount, solvedLocalCount);

  const xpForDifficulty = (d) => {
    if (d === 'Easy') return 10;
    if (d === 'Medium') return 20;
    return 30;
  };

  const xpFromSolved = allProblemsFlat.reduce((acc, p) => {
    const slug = p.titleSlug || slugify(p.title);
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
            {section.problems.map(({ title, difficulty, idx, titleSlug }) => {
                        // Determine status: server-solved takes precedence, otherwise user toggles
                        const slug = (titleSlug || slugify(title));
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
                        href={`https://leetcode.com/problems/${slug}/`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {title}
                      </a>
                      {/** explicit external icon as well */}
                      <a
                        href={`https://leetcode.com/problems/${slug}/`}
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


