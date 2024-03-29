"use strict";

const db = require("../db_pool");
const bcrypt = require("bcrypt");
const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require("../expressError");

const { BCRYPT_WORK_FACTOR } = require("../config.js");
const { Pool } = require('pg'); 

/** Related functions for users. */

const { client } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // PostgreSQL default port
});

class User {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.favorites = [];
  }

  async register() {
    try {
      // Hash the user's password before storing it
      const hashedPassword = await bcrypt.hash(this.password, BCRYPT_WORK_FACTOR); // 10 is the saltRounds

      // Save the user's information, including the hashed password, to the database
      const queryString = 'INSERT INTO users (username, password) VALUES ($1, $2)';
      const values = [this.username, hashedPassword];

      await pool.query(queryString, values);

      return true; // Registration successful
    } catch (error) {
      throw new Error('Registration failed');
    }
  }

  async login() {
    try {
      // Retrieve the user's information, including the hashed password, from the database
      const queryString = 'SELECT * FROM users WHERE username = $1';
      const { rows } = await pool.query(queryString, [this.username]);

      if (rows.length === 0) {
        throw new Error('User not found.');
      }

      const hashedPassword = rows[0].password;

      // Compare the provided password with the hashed password in the database
      const passwordMatch = await bcrypt.compare(this.password, hashedPassword);

      if (passwordMatch) {
        return true; // Login successful
      } else {
        throw new Error('Login failed. Incorrect password.');
      }
    } catch (error) {
      throw new Error('Login failed. ' + error.message);
    }
  }

  // Method to insert a favorite movie name into the "favorites" column
  async addFavoriteMovieName(movieName, movieImdbId) {
    try {
      await this.getFavoriteMovieNames();
      this.favorites.push({ title: movieName, imdbId: movieImdbId });
      await this.saveFavoritesToDatabase();
      return true;
    } catch (error) {
      console.log(error);
      throw new Error('Unable to add movie name to favorites');
    }
  }

  // Method to retrieve all favorite movie names
  async getFavoriteMovieNames() {
    await this.fetchFavoritesFromDatabase();
    return this.favorites;
  }

  // Method to save the favorites array to the database
  async saveFavoritesToDatabase() {
    try {
      const queryString = 'UPDATE users SET favorites = $1 WHERE username = $2';
      const values = [this.favorites, this.username];
      await pool.query(queryString, values);
    } catch (error) {
      console.log(error);
      throw new Error('Unable to save favorites to the database');
    }
  }

  // Method to fetch favorites from the database
  async fetchFavoritesFromDatabase() {
    try {
      const queryString = 'SELECT favorites FROM users WHERE username = $1';
      const { rows } = await pool.query(queryString, [this.username]);
      if (rows.length > 0) {
        this.favorites = rows[0].favorites || [];
      }
    } catch (error) {
      throw new Error('Unable to fetch favorites from the database');
    }
  }
  async deleteFavoriteMovieName(movieName, movieImdbId) {
    try {
            // Fetch the latest favorites from the database
      await this.fetchFavoritesFromDatabase();
      const index = this.favorites.findIndex(favorite => favorite.title === movieName && favorite.imdbId === movieImdbId);
        // If the movieName is found, remove it from the favorites array
      if (index !== -1) {
        this.favorites.splice(index, 1);
  await this.saveFavoritesToDatabase();
        return true; // Movie name deleted from favorites successfully
      } else {
        throw new Error('Movie name not found in favorites.');
      }
    } catch (error) {
      console.log(error);
      throw new Error('Unable to delete movie name from favorites');
    }
  }

  

  // Close the database connection when done
  closeConnection() {
    this.client.end();
  }
}

module.exports = User;




