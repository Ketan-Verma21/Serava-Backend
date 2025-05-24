// File: Backend/services/tokenService.js

const Token = require('../models/Token');

class TokenService {
  // Store tokens for a user
  async storeTokens(email, tokens) {
    try {
      console.log('Storing tokens for user:', email);
      console.log('Token data:', {
        accessToken: tokens.access_token ? 'present' : 'missing',
        refreshToken: tokens.refresh_token ? 'present' : 'missing'
      });

      const tokenDoc = await Token.findOneAndUpdate(
        { email },
        {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + 3600000) // Set to 1 hour from now
        },
        { upsert: true, new: true }
      );
      
      console.log('Tokens stored successfully:', {
        email: tokenDoc.email,
        expiresAt: tokenDoc.expiresAt
      });
      
      return tokenDoc;
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw error;
    }
  }

  // Get tokens for a user
  async getTokens(email) {
    try {
      console.log('Getting tokens for user:', email);
      const tokenDoc = await Token.findOne({ email });
      
      if (!tokenDoc) {
        console.log('No tokens found for user:', email);
        return null;
      }

      console.log('Found tokens for user:', {
        email: tokenDoc.email,
        expiresAt: tokenDoc.expiresAt,
        isExpired: this.isTokenExpired(tokenDoc.expiresAt)
      });

      return {
        access_token: tokenDoc.accessToken,
        refresh_token: tokenDoc.refreshToken,
        expires_at: tokenDoc.expiresAt
      };
    } catch (error) {
      console.error('Error getting tokens:', error);
      throw error;
    }
  }

  // Update tokens for a user
  async updateTokens(email, tokens) {
    try {
      console.log('Updating tokens for user:', email);
      const tokenDoc = await Token.findOneAndUpdate(
        { email },
        {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + 3600000) // Set to 1 hour from now
        },
        { new: true }
      );
      
      console.log('Tokens updated successfully:', {
        email: tokenDoc.email,
        expiresAt: tokenDoc.expiresAt
      });
      
      return tokenDoc;
    } catch (error) {
      console.error('Error updating tokens:', error);
      throw error;
    }
  }

  // Delete tokens for a user
  async deleteTokens(email) {
    try {
      console.log('Deleting tokens for user:', email);
      await Token.deleteOne({ email });
      console.log('Tokens deleted successfully for user:', email);
    } catch (error) {
      console.error('Error deleting tokens:', error);
      throw error;
    }
  }

  // Check if token is expired
  isTokenExpired(expiresAt) {
    const isExpired = new Date(expiresAt) <= new Date();
    console.log('Token expiry check:', {
      expiresAt,
      currentTime: new Date(),
      isExpired
    });
    return isExpired;
  }
}

module.exports = new TokenService(); 