import db from '../config/database.js';
import bcrypt from 'bcryptjs';

const PUBLIC_COLUMNS = 'id, email, first_name, last_name, avatar_color, home_currency, is_demo, created_at';

class User {
  static async create(userData) {
    const { email, password, first_name, last_name, avatar_color, is_demo = false } = userData;
    
    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, avatar_color, is_demo)
      VALUES ($1, $2, $3, $4, COALESCE($5, '#0f766e'), $6)
      RETURNING ${PUBLIC_COLUMNS}
    `;
    
    const result = await db.query(query, [email, password_hash, first_name, last_name, avatar_color, is_demo]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findDemoUsers() {
    const query = `SELECT ${PUBLIC_COLUMNS} FROM users WHERE is_demo = TRUE ORDER BY id`;
    const result = await db.query(query);
    return result.rows;
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static toPublic(user) {
    const { password_hash, updated_at, ...rest } = user;
    return rest;
  }
}

export default User;
