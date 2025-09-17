import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Link } from 'react-router-dom';
import InsightsPanel from '../../components/Insights/InsightsPanel';

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
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [challengeActive, setChallengeActive] = useState(false);
  const [challengeProblems, setChallengeProblems] = useState([]);
  const [challengeTimeLeft, setChallengeTimeLeft] = useState(0); // seconds
  const [challengeTotalTime, setChallengeTotalTime] = useState(0);
  const challengeTimerRef = useRef(null);
  const [notification, setNotification] = useState(null);
  const [challengeHistory, setChallengeHistory] = useState([]);
  const [challengeLeaderboard, setChallengeLeaderboard] = useState([]);
  const GOAL_KEY = 'top150_goal';
  const [goal, setGoal] = useState(() => {
    try { return Number(localStorage.getItem(GOAL_KEY)) || 0; } catch { return 0; }
  });

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

  // Achievements: milestones by solved count
  const MILESTONES = [10, 25, 50, 100, 150];
  const earnedMilestones = MILESTONES.filter(m => solvedCount >= m);
  const prevEarnedRef = useRef(new Set(earnedMilestones));

  useEffect(() => {
    const prev = prevEarnedRef.current;
    const current = new Set(earnedMilestones);
    for (const m of current) {
      if (!prev.has(m)) {
        // new milestone achieved
        const text = `Milestone reached: ${m} solved!`;
        setNotification({ type: 'milestone', text });
        // persist badge server-side if possible
        const award = async () => {
          const badgeName = `Solved ${m}`;
          const badge = { name: badgeName, description: `Solved ${m} problems`, icon: '🏅' };
          try {
            if (user) {
              await axios.post('/users/badges', badge);
            } else {
              setBadges(prev => [ { id: `local-${Date.now()}`, title: badgeName, date: Date.now() }, ...prev ]);
            }
          } catch (e) {
            // fallback to localStorage
            setBadges(prev => [ { id: `local-${Date.now()}`, title: badgeName, date: Date.now() }, ...prev ]);
          }
        };
        award();
        // auto-clear after 4s
        setTimeout(() => setNotification(null), 4000);
        break;
      }
    }
    prevEarnedRef.current = current;
  }, [earnedMilestones.join(',')]);

  // Helper: compute solved count for a section
  const solvedCountForSection = (section) => {
    return section.problems.filter(p => {
      const slug = p.titleSlug || slugify(p.title);
      return serverSolved.has(slug) || statusMap[p.title] === 'solved';
    }).length;
  };

  // Start a challenge with N problems and T seconds (defaults)
  const startChallenge = (numProblems = 5, timeSeconds = 600) => {
    // pick random problems (prefer unsolved)
    const pool = allProblemsFlat.slice();
    // prefer unsolved first
    pool.sort((a, b) => {
      const sa = serverSolved.has(a.titleSlug || slugify(a.title)) || statusMap[a.title] === 'solved' ? 1 : 0;
      const sb = serverSolved.has(b.titleSlug || slugify(b.title)) || statusMap[b.title] === 'solved' ? 1 : 0;
      return sa - sb; // unsolved earlier
    });
    const chosen = [];
    const used = new Set();
    for (let i = 0; i < pool.length && chosen.length < numProblems; i++) {
      const cand = pool[i];
      const key = cand.title;
      if (used.has(key)) continue;
      used.add(key);
      chosen.push(cand);
    }
    setChallengeProblems(chosen);
    setChallengeTotalTime(timeSeconds);
    setChallengeTimeLeft(timeSeconds);
    setChallengeActive(true);
  };

  const stopChallenge = () => {
    setChallengeActive(false);
    setChallengeProblems([]);
    setChallengeTimeLeft(0);
    setChallengeTotalTime(0);
    if (challengeTimerRef.current) {
      clearInterval(challengeTimerRef.current);
      challengeTimerRef.current = null;
    }
  };

  // Persisted badges
  const BADGE_KEY = 'top150_badges';
  const [badges, setBadges] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BADGE_KEY)) || [];
    } catch (e) { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(BADGE_KEY, JSON.stringify(badges)); } catch (e) {}
  }, [badges]);

  // When challenge problem is toggled as solved, mark in statusMap and check completion
  const toggleChallengeProblem = (title) => {
    toggleStatus(title);
    // after a small timeout ensure state updated then check
    setTimeout(() => {
      const allSolved = challengeProblems.every(p => {
        const slug = p.titleSlug || slugify(p.title);
        return serverSolved.has(slug) || statusMap[p.title] === 'solved' || (JSON.parse(localStorage.getItem(STORAGE_KEY)) || {})[p.title] === 'solved';
      });
      if (allSolved) {
        // award a badge for completing a challenge and record the completion
        const badgeName = `Challenge x${challengeProblems.length}`;
        const badgePayload = { name: badgeName, description: `Completed a ${challengeProblems.length}-problem challenge`, icon: '🏁' };
        (async () => {
          try {
            if (user) {
              await axios.post('/users/badges', badgePayload);
            } else {
              const newBadge = { id: `challenge-${Date.now()}`, title: badgeName, date: Date.now() };
              setBadges(prev => [newBadge, ...prev]);
            }
          } catch (e) {
            const newBadge = { id: `challenge-${Date.now()}`, title: badgeName, date: Date.now() };
            setBadges(prev => [newBadge, ...prev]);
          }
        })();
        setNotification({ type: 'challenge', text: `Challenge complete! Badge earned.` });
        setTimeout(() => setNotification(null), 3000);
        // Record challenge completion to backend if possible
        (async () => {
          const payload = {
            problems: challengeProblems.map(p => ({ titleSlug: p.titleSlug || slugify(p.title), title: p.title, difficulty: p.difficulty })),
            numProblems: challengeProblems.length,
            timeTakenSeconds: challengeTotalTime - challengeTimeLeft,
            timeLimitSeconds: challengeTotalTime,
            success: true
          };
          try {
            await axios.post('/challenges/complete', payload);
            // refresh history and leaderboard
            fetchChallengeHistory();
            fetchChallengeLeaderboard();
          } catch (e) {
            // fallback: persist locally
            const local = JSON.parse(localStorage.getItem('local_challenges') || '[]');
            local.unshift({ ...payload, createdAt: Date.now() });
            localStorage.setItem('local_challenges', JSON.stringify(local));
            setChallengeHistory(prev => [{ ...payload, _id: `local-${Date.now()}`, createdAt: Date.now() }, ...prev]);
          }
        })();
        stopChallenge();
      }
    }, 200);
  };

  // Manage timer when challengeActive
  useEffect(() => {
    if (challengeActive && challengeTimeLeft > 0) {
      challengeTimerRef.current = setInterval(() => {
        setChallengeTimeLeft(t => {
          if (t <= 1) {
            // time up
            clearInterval(challengeTimerRef.current);
            challengeTimerRef.current = null;
            setNotification({ type: 'challenge', text: `Challenge ended` });
            setTimeout(() => setNotification(null), 3000);
            setChallengeActive(false);
            // record failure if user attempted
            const payload = {
              problems: challengeProblems.map(p => ({ titleSlug: p.titleSlug || slugify(p.title), title: p.title, difficulty: p.difficulty })),
              numProblems: challengeProblems.length,
              timeTakenSeconds: challengeTotalTime - 0,
              timeLimitSeconds: challengeTotalTime,
              success: false
            };
            (async () => {
              try {
                await axios.post('/challenges/complete', payload);
                fetchChallengeHistory();
                fetchChallengeLeaderboard();
              } catch (e) {
                const local = JSON.parse(localStorage.getItem('local_challenges') || '[]');
                local.unshift({ ...payload, createdAt: Date.now() });
                localStorage.setItem('local_challenges', JSON.stringify(local));
                setChallengeHistory(prev => [{ ...payload, _id: `local-${Date.now()}`, createdAt: Date.now() }, ...prev]);
              }
            })();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => {
        if (challengeTimerRef.current) clearInterval(challengeTimerRef.current);
      };
    }
    return undefined;
  }, [challengeActive]);

  // Fetch challenge history & leaderboard (with graceful local fallback)
  const fetchChallengeHistory = async () => {
    try {
      const resp = await axios.get('/challenges/history');
      setChallengeHistory(resp.data.items || []);
    } catch (e) {
      // local fallback
      const local = JSON.parse(localStorage.getItem('local_challenges') || '[]');
      setChallengeHistory(local);
    }
  };

  const fetchChallengeLeaderboard = async () => {
    try {
      const resp = await axios.get('/challenges/leaderboard');
      setChallengeLeaderboard(resp.data.rows || []);
    } catch (e) {
      setChallengeLeaderboard([]);
    }
  };

  useEffect(() => { fetchChallengeHistory(); fetchChallengeLeaderboard(); }, []);

  // Goals persistence
  useEffect(() => {
    try { localStorage.setItem(GOAL_KEY, String(goal || 0)); } catch (e) {}
  }, [goal]);

  const renderBadge = (difficulty) => {
    const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
    if (difficulty === 'Easy') return <span className={`${base} bg-green-50 text-green-700`}>Easy</span>;
    if (difficulty === 'Medium') return <span className={`${base} bg-yellow-50 text-yellow-700`}>Medium</span>;
    return <span className={`${base} bg-red-50 text-red-700`}>Hard</span>;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Top Interview 150</h1>

      {/* Badges strip */}
      {badges.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          {badges.map(b => (
            <div key={b.id} className="px-3 py-1 bg-yellow-50 text-yellow-800 rounded-full text-sm font-medium">{b.title}</div>
          ))}
        </div>
      )}

      {/* Compact single-row summary bar (minimized) */}
      <div className="mb-4 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center gap-3 overflow-x-auto">
        {/* Goal input */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">Goal</div>
          <input
            type="number"
            className="input input-bordered w-20 text-sm"
            value={goal || ''}
            onChange={(e) => setGoal(Number(e.target.value))}
            placeholder="0"
          />
          <button
            className="px-2 py-1 bg-indigo-600 text-white text-sm rounded"
            onClick={() => { try { localStorage.setItem(GOAL_KEY, String(goal || 0)); } catch {} }}
          >Save</button>
        </div>

        {/* Progress mini */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">Progress</div>
          <div className="w-36 bg-gray-200 dark:bg-gray-700 h-2 rounded overflow-hidden">
            <div
              className="h-2 bg-green-500"
              style={{ width: `${Math.min(100, Math.round((solvedCount / (goal || totalCount || 1)) * 100))}%` }}
            />
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">{Math.min(100, Math.round((solvedCount / (goal || totalCount || 1)) * 100))}%</div>
        </div>

        {/* Solved / XP chips */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">Solved</div>
          <div className="text-sm font-semibold">{solvedCount}/{totalCount}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">XP (list)</div>
          <div className="text-sm font-semibold">+{xpFromSolved}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">Your XP</div>
          <div className="text-sm font-semibold">{user?.xp ?? '—'}</div>
        </div>

        {/* Small misc stats */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">Streak</div>
          <div className="text-sm">{user?.streak?.current || 0}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">Best</div>
          <div className="text-sm">{user?.streak?.best || 0}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">Top Tag</div>
          <div className="text-sm">—</div>
        </div>

        {/* Challenge history / leaderboard small indicators */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">History</div>
          <div className="text-sm">{challengeHistory.length || '0'}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">Leaderboard</div>
          <div className="text-sm">{challengeLeaderboard.length ? challengeLeaderboard[0]?.user?.leetcodeUsername || challengeLeaderboard[0]?._id : '—'}</div>
        </div>

        {/* Challenge Mode compact controls aligned to the right */}
        <div className="ml-auto flex items-center gap-2">
          {!challengeActive ? (
            <>
              <button className="px-2 py-1 bg-blue-600 text-white text-sm rounded" onClick={() => startChallenge(5, 600)}>5p</button>
              <button className="px-2 py-1 bg-blue-600 text-white text-sm rounded" onClick={() => startChallenge(10, 900)}>10p</button>
            </>
          ) : (
            <>
              <div className="text-sm">{Math.floor(challengeTimeLeft/60)}:{String(challengeTimeLeft%60).padStart(2,'0')}</div>
              <button className="px-2 py-1 bg-red-600 text-white text-sm rounded" onClick={stopChallenge}>Stop</button>
            </>
          )}
        </div>
      </div>

      {/* Notification / badge area */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 p-3 rounded shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium">{notification.text}</div>
        </div>
      )}

      {numberedSections.map((section) => {
        // Filter problems by search and difficulty
        const filteredProblems = section.problems.filter(({ title, difficulty, titleSlug }) => {
          const searchLower = search.trim().toLowerCase();
          const matchesSearch =
            !searchLower ||
            title.toLowerCase().includes(searchLower) ||
            (titleSlug && titleSlug.toLowerCase().includes(searchLower));
          const matchesDifficulty =
            difficultyFilter === 'All' || difficulty === difficultyFilter;
          return matchesSearch && matchesDifficulty;
        });
        if (filteredProblems.length === 0) return null;
        return (
          <section key={section.title} className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <div className="text-sm text-gray-500">{solvedCountForSection(section)} / {section.problems.length}</div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden mb-3">
              <div
                className="h-2 bg-green-500"
                style={{ width: `${Math.round((solvedCountForSection(section) / section.problems.length) * 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProblems.map(({ title, difficulty, idx, titleSlug }) => {
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{difficulty}</span>
                          <button
                            title="Share this problem"
                            className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await axios.post('/feed', { type: 'share_problem', text: `Solved ${title} on DSA Tracer`, meta: { titleSlug: titleSlug || slugify(title), title } });
                                // optimistic refresh: no-op
                              } catch (err) {
                                // ignore
                              }
                            }}
                          >Share</button>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default TopInterview;


