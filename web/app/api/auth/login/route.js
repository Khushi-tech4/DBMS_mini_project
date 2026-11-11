// POST /api/auth/login   body: { username, password }
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/session";
import { logSecurityEvent, clientIp } from "@/lib/security";
import { logActivity, requestMeta } from "@/lib/activity";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password || username.length > 50 || password.length > 200) {
    return Response.json({ error: "Enter a username and password" }, { status: 400 });
  }

  // Parameterised query (?) prevents SQL injection
  const [rows] = await pool.execute(
    `SELECT u.user_id, u.customer_id, u.password_hash, u.is_active, r.role_name
       FROM USER_ACCOUNT u
       JOIN \`ROLE\` r ON r.role_id = u.role_id
      WHERE u.username = ?`,
    [username]
  );
  const user = rows[0];
  const ip = clientIp(request);
  const meta = requestMeta(request);

  const ok = user && user.is_active && (await bcrypt.compare(password, user.password_hash));

  if (!ok) {
    // MongoDB activity log (also records attempts with an unknown username)
    logActivity("LOGIN", "FAILURE", {
      username,
      customerId: user ? user.customer_id : null,
      ...meta,
      details: { reason: !user ? "unknown username" : user.is_active ? "wrong password" : "account inactive" },
    });
    if (user) {
      await logSecurityEvent(
        user.customer_id,
        "LOGIN_FAILED",
        ip,
        `Failed login for username ${username}`,
        "MEDIUM"
      );

      // Fraud rule: 3 failed logins within 10 minutes -> HIGH severity event
      try {
        const [cnt] = await pool.execute(
          `SELECT COUNT(*) AS n FROM SECURITY_EVENT
            WHERE customer_id = ? AND event_type = 'LOGIN_FAILED'
              AND event_time >= NOW() - INTERVAL 10 MINUTE`,
          [user.customer_id]
        );
        if (cnt[0].n === 3) {
          await logSecurityEvent(
            user.customer_id,
            "BRUTE_FORCE_SUSPECTED",
            ip,
            `3 failed logins within 10 minutes for username ${username}`,
            "HIGH"
          );
        }
      } catch (err) {
        console.error("Failed-login check error:", err.message);
      }
    }
    // Same message whether the username or the password was wrong
    return Response.json({ error: "Invalid username or password" }, { status: 401 });
  }

  await pool.execute("UPDATE USER_ACCOUNT SET last_login = NOW() WHERE user_id = ?", [user.user_id]);
  await logSecurityEvent(user.customer_id, "LOGIN_SUCCESS", ip, `Login by ${username}`, "LOW");

  logActivity("LOGIN", "SUCCESS", {
    userId: user.user_id,
    customerId: user.customer_id,
    username,
    ...meta,
    details: { role: user.role_name },
  });

  await createSession({
    userId: user.user_id,
    customerId: user.customer_id,
    role: user.role_name,
  });

  return Response.json({ role: user.role_name });
}
