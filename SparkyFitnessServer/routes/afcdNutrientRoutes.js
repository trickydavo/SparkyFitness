const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { getClient } = require('../db/poolManager');
const { canAccessUserData } = require('../utils/permissionUtils');

/**
 * GET /api/afcd-nutrients/daily-summary
 *
 * Aggregates AFCD nutrient values from food entries for a date range.
 * Only covers foods that have rows in the afcd_nutrients table (AFCD-sourced foods).
 * Values are scaled by (quantity / serving_size) — same pattern as reportRepository.
 *
 * Query params:
 *   userId    - target user UUID (optional, defaults to authenticated user)
 *   startDate - YYYY-MM-DD
 *   endDate   - YYYY-MM-DD
 *
 * Response:
 *   Array of { nutrient_key, nutrient_label, unit, daily_totals: [{ date, total }], seven_day_avg }
 *   Sorted by nutrient_key.
 */
router.get('/daily-summary', authenticate, async (req, res, next) => {
  const { userId, startDate, endDate } = req.query;
  const targetUserId = userId || req.userId;

  if (!targetUserId || !startDate || !endDate) {
    return res.status(400).json({
      error: 'startDate and endDate are required.',
    });
  }

  if (userId && userId !== req.userId) {
    const hasPermission = await canAccessUserData(
      userId,
      'reports',
      req.authenticatedUserId || req.userId
    );
    if (!hasPermission) {
      return res
        .status(403)
        .json({ error: "Forbidden: no permission to view this user's data." });
    }
  }

  const client = await getClient(targetUserId);
  try {
    // Join food_entries (both standalone and meal-component) → afcd_nutrients.
    // Scale per-100g nutrient value by logged quantity / serving_size.
    // UNION ALL mirrors the pattern in reportRepository.getNutritionData().
    const result = await client.query(
      `SELECT
         an.nutrient_key,
         an.nutrient_label,
         an.unit,
         TO_CHAR(combined.entry_date, 'YYYY-MM-DD') AS date,
         ROUND(SUM(an.value * combined.quantity / combined.serving_size)::numeric, 4) AS daily_total
       FROM (
         -- Standalone food entries (not part of a saved meal)
         SELECT fe.food_id, fe.entry_date, fe.quantity, fe.serving_size
         FROM food_entries fe
         WHERE fe.user_id = $1
           AND fe.entry_date BETWEEN $2 AND $3
           AND fe.food_entry_meal_id IS NULL
           AND fe.serving_size > 0

         UNION ALL

         -- Food entries that are components of saved meals
         SELECT fe_meal.food_id, fem.entry_date, fe_meal.quantity, fe_meal.serving_size
         FROM food_entry_meals fem
         JOIN food_entries fe_meal ON fem.id = fe_meal.food_entry_meal_id
         WHERE fem.user_id = $1
           AND fem.entry_date BETWEEN $2 AND $3
           AND fe_meal.serving_size > 0
       ) AS combined
       JOIN afcd_nutrients an ON an.food_id = combined.food_id
       WHERE an.value IS NOT NULL
       GROUP BY an.nutrient_key, an.nutrient_label, an.unit,
                TO_CHAR(combined.entry_date, 'YYYY-MM-DD')
       ORDER BY an.nutrient_key, date`,
      [targetUserId, startDate, endDate]
    );

    // Reshape flat rows into per-nutrient objects with daily_totals array + 7-day avg.
    const byKey = {};
    for (const row of result.rows) {
      if (!byKey[row.nutrient_key]) {
        byKey[row.nutrient_key] = {
          nutrient_key: row.nutrient_key,
          nutrient_label: row.nutrient_label,
          unit: row.unit,
          daily_totals: [],
        };
      }
      byKey[row.nutrient_key].daily_totals.push({
        date: row.date,
        total: parseFloat(row.daily_total),
      });
    }

    // Calculate 7-day rolling average (last 7 days of the requested range).
    const nutrients = Object.values(byKey).map((n) => {
      const totals = n.daily_totals;
      const last7 = totals.slice(-7);
      const avg =
        last7.length > 0
          ? last7.reduce((sum, d) => sum + d.total, 0) / last7.length
          : 0;
      return {
        ...n,
        seven_day_avg: Math.round(avg * 100) / 100,
      };
    });

    res.json(nutrients);
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
});

/**
 * GET /api/afcd-nutrients/top-foods
 *
 * Returns the top AFCD foods by per-100g content for a given nutrient key.
 * Used to generate "eat more of these" suggestions for nutrient gaps.
 *
 * Query params:
 *   nutrientKey - e.g. 'iron_mg', 'cobalamin_b12_ug'
 *   limit       - number of foods to return (default 6, max 20)
 */
router.get('/top-foods', authenticate, async (req, res, next) => {
  const { nutrientKey, limit = '6' } = req.query;
  if (!nutrientKey) {
    return res.status(400).json({ error: 'nutrientKey is required.' });
  }
  const limitNum = Math.min(parseInt(limit, 10) || 6, 20);

  // Use a system-level client (no RLS needed — AFCD foods are public)
  const client = await getClient(req.userId);
  try {
    const result = await client.query(
      `SELECT
         f.id,
         f.name,
         an.value,
         an.unit
       FROM afcd_nutrients an
       JOIN foods f ON f.id = an.food_id
       WHERE an.nutrient_key = $1
         AND an.value IS NOT NULL
         AND an.value > 0
         AND f.provider_type = 'afcd'
       ORDER BY an.value DESC
       LIMIT $2`,
      [nutrientKey, limitNum]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
