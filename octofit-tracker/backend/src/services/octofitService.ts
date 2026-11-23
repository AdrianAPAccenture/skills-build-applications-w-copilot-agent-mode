import { Activity, Team, User, Workout } from '../models/index.js';
import mongoose from 'mongoose';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(_input: unknown) {
  if (!_input || typeof _input !== 'object') {
    throw Object.assign(new Error('A valid activity is required'), { status: 400 });
  }

  const input = _input as {
    userId?: unknown;
    teamId?: unknown;
    type?: unknown;
    minutes?: unknown;
  };
  const userId = typeof input.userId === 'string' ? input.userId : '';
  const teamId = typeof input.teamId === 'string' ? input.teamId : '';
  const type = typeof input.type === 'string' ? input.type.trim() : '';
  const minutes = typeof input.minutes === 'number' ? input.minutes : Number(input.minutes);

  if (
    !mongoose.isValidObjectId(userId)
    || !mongoose.isValidObjectId(teamId)
    || !type
    || !Number.isFinite(minutes)
    || minutes < 1
  ) {
    throw Object.assign(new Error('Invalid activity input'), { status: 400 });
  }

  const [user, team] = await Promise.all([
    User.findById(userId).lean(),
    Team.findById(teamId).lean(),
  ]);

  if (!user || !team) {
    throw Object.assign(new Error('Activity user or team was not found'), { status: 404 });
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(_input: unknown) {
  if (!_input || typeof _input !== 'object') {
    throw Object.assign(new Error('A valid team is required'), { status: 400 });
  }

  const input = _input as {
    name?: unknown;
    mascot?: unknown;
    members?: unknown;
  };
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const mascot = typeof input.mascot === 'string' ? input.mascot.trim() : '';
  if (!name) {
    throw Object.assign(new Error('Team name is required'), { status: 400 });
  }

  const members = Array.isArray(input.members)
    ? input.members.filter((member): member is string =>
      typeof member === 'string' && mongoose.isValidObjectId(member),
    )
    : [];

  return Team.create({ name, mascot, members });
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate([
    {
      $group: {
        _id: '$team',
        totalPoints: { $sum: '$points' },
      },
    },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);

  return Promise.all(totals.map(async (total, index) => {
    const team = await Team.findById(total._id).lean();
    return {
      teamName: team?.name ?? 'Unknown team',
      totalPoints: total.totalPoints,
      rank: index + 1,
    };
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim() }).lean();
  if (!user) {
    throw Object.assign(new Error('User was not found'), { status: 404 });
  }

  const recentActivity = await Activity.findOne({ user: user._id })
    .sort({ occurredAt: -1 })
    .lean();

  const activityFocus = recentActivity?.type?.trim();
  const goalFocus = typeof user.fitnessGoal === 'string' ? user.fitnessGoal.trim() : '';
  const focus = goalFocus || activityFocus;

  const workouts = await Workout.find().lean();
  const matching = workouts.filter((workout) =>
    typeof workout.focus === 'string'
    && workout.focus.toLowerCase() === (focus || '').toLowerCase(),
  );
  const suggestions = matching.length > 0 ? matching : workouts;

  return suggestions.map((workout) => {
    const reason = activityFocus
      ? `Matches your recent ${activityFocus} activity and fitness goal.`
      : `Matches your ${goalFocus || 'current'} fitness goal.`;
    return { ...workout, reason };
  });
}

export { User };
