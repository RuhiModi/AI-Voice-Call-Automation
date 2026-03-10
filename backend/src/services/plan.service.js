// src/services/plan.service.js
// Checks usage limits before allowing actions.
// Called from campaign.service.js and scheduler.service.js

const pool = require('../db/supabaseClient')

// ── Get user's current plan + limits ─────────────────────────
async function getUserPlan(userId) {
  const { rows } = await pool.query(
    `SELECT u.plan, u.plan_expires_at,
            p.calls_per_month, p.campaigns_limit,
            p.contacts_per_campaign, p.team_members_limit,
            p.rate_per_min, p.name AS plan_name, p.features
     FROM users u
     LEFT JOIN plans p ON p.id = u.plan
     WHERE u.id = $1`,
    [userId]
  )
  return rows[0] || { plan: 'free', calls_per_month: 100, campaigns_limit: 3, contacts_per_campaign: 100, team_members_limit: 1 }
}

// ── Get current month usage ───────────────────────────────────
async function getMonthUsage(userId) {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const { rows: callRows } = await pool.query(
    `SELECT COUNT(*) AS calls
     FROM call_logs cl
     JOIN campaigns camp ON cl.campaign_id = camp.id
     WHERE camp.user_id = $1
       AND cl.started_at >= $2
       AND cl.started_at <  $3`,
    [userId, start, end]
  )

  const { rows: campRows } = await pool.query(
    `SELECT COUNT(*) AS campaigns FROM campaigns WHERE user_id = $1`,
    [userId]
  )

  return {
    calls_this_month: parseInt(callRows[0]?.calls || 0),
    campaigns_total:  parseInt(campRows[0]?.campaigns || 0),
  }
}

// ── Check if user can make more calls ─────────────────────────
// Returns { allowed: bool, reason: string, usage: {}, plan: {} }
async function checkCallLimit(userId) {
  const [plan, usage] = await Promise.all([getUserPlan(userId), getMonthUsage(userId)])

  // NULL = unlimited
  if (plan.calls_per_month === null) return { allowed: true, plan, usage }

  const pct = usage.calls_this_month / plan.calls_per_month

  if (pct >= 1) {
    return {
      allowed: false,
      reason:  `Monthly call limit reached (${usage.calls_this_month}/${plan.calls_per_month}). Upgrade your plan to continue.`,
      warning: false,
      plan, usage,
    }
  }

  return {
    allowed: true,
    warning: pct >= 0.8,  // warn at 80%
    warningMsg: pct >= 0.8
      ? `You've used ${Math.round(pct * 100)}% of your monthly calls (${usage.calls_this_month}/${plan.calls_per_month})`
      : null,
    plan, usage,
  }
}

// ── Check if user can create another campaign ─────────────────
async function checkCampaignLimit(userId) {
  const [plan, usage] = await Promise.all([getUserPlan(userId), getMonthUsage(userId)])

  if (plan.campaigns_limit === null) return { allowed: true, plan, usage }

  if (usage.campaigns_total >= plan.campaigns_limit) {
    return {
      allowed: false,
      reason:  `Campaign limit reached (${usage.campaigns_total}/${plan.campaigns_limit}). Upgrade your plan to create more campaigns.`,
      plan, usage,
    }
  }

  return { allowed: true, plan, usage }
}

// ── Check if contacts file is within plan limit ───────────────
async function checkContactLimit(userId, contactCount) {
  const plan = await getUserPlan(userId)

  if (plan.contacts_per_campaign === null) return { allowed: true, plan }

  if (contactCount > plan.contacts_per_campaign) {
    return {
      allowed: false,
      reason:  `Your plan allows up to ${plan.contacts_per_campaign} contacts per campaign. You uploaded ${contactCount}. Upgrade to add more.`,
      plan,
    }
  }

  return { allowed: true, plan }
}

// ── Full usage summary (for billing/dashboard) ────────────────
async function getUsageSummary(userId) {
  const [plan, usage] = await Promise.all([getUserPlan(userId), getMonthUsage(userId)])

  const callPct = plan.calls_per_month
    ? Math.round((usage.calls_this_month / plan.calls_per_month) * 100)
    : null

  const campPct = plan.campaigns_limit
    ? Math.round((usage.campaigns_total / plan.campaigns_limit) * 100)
    : null

  return {
    plan: {
      id:         plan.plan,
      name:       plan.plan_name,
      features:   plan.features,
      rate_per_min: plan.rate_per_min,
    },
    limits: {
      calls_per_month:       plan.calls_per_month,
      campaigns_limit:       plan.campaigns_limit,
      contacts_per_campaign: plan.contacts_per_campaign,
      team_members_limit:    plan.team_members_limit,
    },
    usage: {
      calls_this_month: usage.calls_this_month,
      campaigns_total:  usage.campaigns_total,
    },
    percentages: {
      calls:     callPct,
      campaigns: campPct,
    },
    warnings: {
      calls:     callPct !== null && callPct >= 80,
      campaigns: campPct !== null && campPct >= 80,
    },
    at_limit: {
      calls:     callPct !== null && callPct >= 100,
      campaigns: campPct !== null && campPct >= 100,
    },
  }
}

module.exports = { getUserPlan, getMonthUsage, checkCallLimit, checkCampaignLimit, checkContactLimit, getUsageSummary }
