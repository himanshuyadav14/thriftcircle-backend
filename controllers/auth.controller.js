const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const apiResponse = require("../utils/apiResponse");
const { User, RefreshToken } = require("../models/postgres");
const { issueTokens, rotateRefreshToken } = require("../utils/generateTokens");
const cloudinaryService = require("../services/cloudinary.service");
const emailService = require("../services/email.service");

function displayNameFromEmail(email) {
  const local = String(email || "")
    .split("@")[0]
    .replace(/[._+-]+/g, " ")
    .trim();
  const parts = local.split(/\s+/).filter(Boolean);
  const titled =
    parts.length === 0
      ? ""
      : parts
          .map(
            (w) =>
              w.charAt(0).toUpperCase() + (w.length > 1 ? w.slice(1).toLowerCase() : ""),
          )
          .join(" ")
          .trim();
  if (titled.length >= 2) return titled.slice(0, 100);
  return "ThriftCircle member";
}

async function allocateUsername(UserModel, preferred) {
  const base =
    String(preferred || "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 26) || "thr";
  let n = 0;
  let candidate = base.slice(0, 30);
  while (n < 500) {
    // sequential suffix keeps usernames readable; loop is rare
    // eslint-disable-next-line no-await-in-loop
    const taken = await UserModel.findOne({ where: { username: candidate } });
    if (!taken) return candidate;
    n += 1;
    const suf = String(n);
    candidate = (base + suf).slice(0, 30);
  }
  return `tc_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`.slice(0, 30);
}

async function resolvedRegisterIdentity(UserModel, body) {
  const email = String(body.email || "").trim().toLowerCase();
  let fullName = String(body.full_name || "").trim();
  if (fullName.length < 2) fullName = displayNameFromEmail(email);

  let username = String(body.username || "").trim();
  if (!username || username.length < 3) {
    const local = (email.split("@")[0] || "user").toLowerCase();
    let slug = local.replace(/[^a-z0-9_]/g, "");
    if (slug.length < 3) slug = `u${Date.now().toString(36)}`;
    username = await allocateUsername(UserModel, slug);
  }

  return { email, full_name: fullName.slice(0, 100), username: username.slice(0, 30) };
}

const register = async (req, res) => {
  try {
    let avatar_url = null;
    if (req.file && req.file.buffer) {
      const up = await cloudinaryService.uploadImage(
        req.file.buffer,
        "avatars",
      );
      avatar_url = up.url;
    }

    const { password, phone, city, state } = req.body;
    const { email, full_name, username } = await resolvedRegisterIdentity(
      User,
      req.body,
    );

    const phoneDigits = String(phone || "")
      .replace(/\D/g, "")
      .slice(-15);
    const existing = await User.findOne({
      where: { email },
    });
    if (existing) {
      return apiResponse.error(res, "Email already registered", 400);
    }

    const uName = await User.findOne({ where: { username } });
    if (uName) {
      return apiResponse.error(res, "Username already taken", 400);
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      full_name,
      username,
      email,
      password: hash,
      phone: phoneDigits || null,
      city: city || null,
      state: state || null,
      avatar_url,
    });

    const tokens = await issueTokens(user);
    emailService.sendWelcomeEmail(user);

    return apiResponse.success(
      res,
      {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      "Registered",
      201,
    );
  } catch (e) {
    console.error(e);
    return apiResponse.error(res, "Something went wrong", 500);
  }
};

const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    const credential = email || username;
    if (!credential || !password) {
      return apiResponse.error(
        res,
        "Email or username and password required",
        400,
      );
    }

    let user =
      (await User.scope("withPassword").findOne({
        where: { email: credential },
      })) ||
      (await User.scope("withPassword").findOne({
        where: { username: credential },
      }));

    if (!user) {
      return apiResponse.error(res, "Invalid email or password", 401);
    }

    if (user.is_banned) {
      return apiResponse.error(res, "Account banned", 403);
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return apiResponse.error(res, "Invalid email or password", 401);

    await RefreshToken.destroy({ where: { user_id: user.id } });

    const tokens = await issueTokens(user);

    delete user.dataValues.password;
    delete user.password;

    console.log({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    console.log(tokens.accessToken);
    console.log(tokens.refreshToken);

    return apiResponse.success(res, {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (e) {
    console.error(e);
    return apiResponse.error(res, "Something went wrong", 500);
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return apiResponse.error(res, "Refresh token missing", 400);

    const row = await RefreshToken.findOne({
      where: { token: refreshToken },
      include: [
        {
          model: User,
          attributes: ["id", "username", "email", "role", "is_banned"],
        },
      ],
    });

    if (!row || row.expires_at < new Date()) {
      return apiResponse.error(res, "Invalid refresh token", 401);
    }

    const linked = row.User || row.user;
    if (!linked || linked.is_banned) {
      return apiResponse.error(res, "Invalid refresh token", 401);
    }

    const user = await User.findByPk(linked.id);
    if (!user || user.is_banned) {
      return apiResponse.error(res, "Invalid refresh token", 401);
    }

    const tokens = await rotateRefreshToken(user, refreshToken);

    delete user.dataValues.password;
    delete user.password;

    return apiResponse.success(res, {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (e) {
    console.error(e);
    return apiResponse.error(res, "Something went wrong", 500);
  }
};

const logout = async (req, res) => {
  try {
    await RefreshToken.destroy({ where: { user_id: req.user.id } });
    return apiResponse.success(res, null, "Logged out");
  } catch (e) {
    return apiResponse.error(res, "Something went wrong", 500);
  }
};

module.exports = { register, login, refresh, logout };
