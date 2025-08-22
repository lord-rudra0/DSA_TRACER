import XpLog from '../models/XpLog.js';
import User from '../models/User.js';

export function getCurrentSeasonKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`; // monthly seasons
}

export async function awardXP(userId, delta, reason, meta = {}) {
  if (!delta || !Number.isFinite(delta)) return null;
  const user = await User.findById(userId);
  if (!user) return null;

  // Ensure season alignment
  const currentKey = getCurrentSeasonKey();
  if (user.seasonKey !== currentKey) {
    user.seasonKey = currentKey;
    user.seasonXP = 0;
  }

  user.xp = (user.xp || 0) + delta;
  user.seasonXP = (user.seasonXP || 0) + delta;
  // Level recalculation based on existing method
  if (typeof user.calculateLevel === 'function') {
    user.checkLevelUp?.();
  } else {
    user.level = Math.floor(Math.sqrt((user.xp || 0) / 100)) + 1;
  }
  await user.save();

  const log = await XpLog.create({ user: user._id, delta, reason, meta });
  return { user, log };
}
