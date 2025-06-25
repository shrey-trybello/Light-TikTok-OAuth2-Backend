const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecureTokenStorage {
  constructor(encryptionKey, filePath = './tokens.encrypted.json') {
    this.encryptionKey = encryptionKey || this.generateEncryptionKey();
    this.filePath = filePath;
    
    // Ensure the encryption key is at least 32 bytes for AES-256
    if (this.encryptionKey.length < 32) {
      this.encryptionKey = crypto.scryptSync(this.encryptionKey, 'salt', 32).toString('hex');
    }
  }

  // Generate a random encryption key if none provided
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Encrypt data
  encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      encrypted: encrypted
    };
  }

  // Decrypt data
  decrypt(encryptedData) {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error.message);
      return null;
    }
  }

  // Save tokens to encrypted file
  saveTokens(tokens) {
    try {
      const encrypted = this.encrypt(tokens);
      fs.writeFileSync(this.filePath, JSON.stringify(encrypted));
      console.log('Tokens saved securely');
      return true;
    } catch (error) {
      console.error('Failed to save tokens:', error.message);
      return false;
    }
  }

  // Load tokens from encrypted file
  loadTokens() {
    try {
      if (!fs.existsSync(this.filePath)) {
        console.log('No existing tokens found');
        return null;
      }

      const encryptedData = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      const tokens = this.decrypt(encryptedData);
      
      if (tokens) {
        console.log('Tokens loaded successfully');
        return tokens;
      } else {
        console.log('Failed to decrypt tokens');
        return null;
      }
    } catch (error) {
      console.error('Failed to load tokens:', error.message);
      return null;
    }
  }

  // Clear stored tokens
  clearTokens() {
    try {
      if (fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
        console.log('Tokens cleared');
      }
      return true;
    } catch (error) {
      console.error('Failed to clear tokens:', error.message);
      return false;
    }
  }

  // Check if tokens exist and are valid
  hasValidTokens() {
    const tokens = this.loadTokens();
    if (!tokens || !tokens.access_token) {
      return false;
    }
    
    // Check if token is expired (with 5 minute buffer)
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    return Date.now() < (tokens.expires_at - bufferTime);
  }
}

module.exports = SecureTokenStorage;