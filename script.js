// ========================================
//   DONGTUBE - JSONBIN INTEGRATION
// ========================================

// JSONBin Data Manager
class JSONBinManager {
  constructor() {
    // GANTI DENGAN DATA ANDA DARI JSONBIN.IO
    this.binId = '68c7fdc9d0ea881f407e85cc'; // Misal: '67890abcdef12345'
    this.apiKey = '$2a$10$PsVzgljojE5fq8qZRmpE4uzMr0K9LArqfmumGVSmNY.P8F2iTKrim'; // Misal: '$2a$10$abc123def456...'
    this.baseURL = `https://api.jsonbin.io/v3/b/${this.binId}`;
    
    this.localData = [];
    this.isOnline = navigator.onLine;
    this.adminApiKey = 'hanzyy001'; // API key untuk admin access
    this.initializeNetworkListeners();
  }

  initializeNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingChanges();
      this.updateConnectionStatus();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateConnectionStatus();
    });
  }

  updateConnectionStatus() {
    const indicator = document.getElementById('connectionStatus');
    if (indicator) {
      const statusClass = this.isOnline ? 'online' : 'offline';
      const statusText = this.isOnline ? '🟢 Online' : '🔴 Offline';
      const pendingCount = this.getPendingChangesCount();
      const pendingText = pendingCount > 0 ? ` (${pendingCount} pending)` : '';
      
      indicator.innerHTML = `
        <div class="connection-indicator ${statusClass}">
          ${statusText}${pendingText}
        </div>
      `;
    }
  }

  // Load anime data from JSONBin
  async loadAnimeData() {
    if (this.isOnline && this.binId !== '68c7fdc9d0ea881f407e85cc') {
      try {
        themeManager?.showToast('📥 Loading data from server...', 'info');
        
        const response = await fetch(`${this.baseURL}/latest`, {
          method: 'GET',
          headers: {
            'X-Master-Key': this.apiKey,
            'X-Bin-Meta': 'false' // Only return the data, not metadata
          }
        });

        if (response.ok) {
          const data = await response.json();
          this.localData = Array.isArray(data) ? data : [];
          this.saveToLocalStorage();
          themeManager?.showToast('✅ Data loaded from server', 'success');
          return this.localData;
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.warn('Failed to load from JSONBin:', error);
        themeManager?.showToast('⚠️ Using offline data', 'warning');
      }
    }

    // Fallback to localStorage or default data
    return this.loadFromLocalStorage();
  }

  // Save all data to JSONBin
  async saveToJSONBin(data) {
    if (!this.isOnline || this.binId === '68c7fdc9d0ea881f407e85cc') {
      return { success: false, error: 'Offline or not configured' };
    }

    try {
      const response = await fetch(this.baseURL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': this.apiKey
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, data: result };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to save to JSONBin:', error);
      return { success: false, error: error.message };
    }
  }

  // Add new anime
  async addAnime(animeData) {
    // Generate new ID
    const newId = this.localData.length > 0 ? 
      Math.max(...this.localData.map(a => a.id)) + 1 : 1;

    const newAnime = {
      id: newId,
      title: animeData.title,
      thumb: animeData.thumb,
      status: animeData.status,
      year: animeData.year || new Date().getFullYear(),
      genre: animeData.genre || 'Unknown',
      rating: animeData.rating || 7.0,
      description: animeData.description || '',
      episodes: animeData.episodes || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to local data
    this.localData.push(newAnime);

    if (this.isOnline && this.binId !== '68c7fdc9d0ea881f407e85cc') {
      // Try to save to JSONBin
      const result = await this.saveToJSONBin(this.localData);
      
      if (result.success) {
        this.saveToLocalStorage();
        return { success: true, data: newAnime };
      } else {
        // If save failed, store for later sync
        this.storePendingChange('add', newAnime);
        this.saveToLocalStorage();
        return { success: false, error: result.error, data: newAnime };
      }
    } else {
      // Offline mode
      this.storePendingChange('add', newAnime);
      this.saveToLocalStorage();
      return { success: true, data: newAnime, offline: true };
    }
  }

  // Update anime
  async updateAnime(id, animeData) {
    const index = this.localData.findIndex(a => a.id === id);
    if (index === -1) {
      return { success: false, error: 'Anime not found' };
    }

    // Update local data
    this.localData[index] = {
      ...this.localData[index],
      ...animeData,
      id, // Keep original ID
      updatedAt: new Date().toISOString()
    };

    const updatedAnime = this.localData[index];

    if (this.isOnline && this.binId !== '68c7fdc9d0ea881f407e85cc') {
      // Try to save to JSONBin
      const result = await this.saveToJSONBin(this.localData);
      
      if (result.success) {
        this.saveToLocalStorage();
        return { success: true, data: updatedAnime };
      } else {
        this.storePendingChange('update', { id, data: animeData });
        this.saveToLocalStorage();
        return { success: false, error: result.error, data: updatedAnime };
      }
    } else {
      // Offline mode
      this.storePendingChange('update', { id, data: animeData });
      this.saveToLocalStorage();
      return { success: true, data: updatedAnime, offline: true };
    }
  }

  // Delete anime
  async deleteAnime(id) {
    const index = this.localData.findIndex(a => a.id === id);
    if (index === -1) {
      return { success: false, error: 'Anime not found' };
    }

    // Remove from local data
    const deletedAnime = this.localData.splice(index, 1)[0];

    if (this.isOnline && this.binId !== '68c7fdc9d0ea881f407e85cc') {
      // Try to save to JSONBin
      const result = await this.saveToJSONBin(this.localData);
      
      if (result.success) {
        this.saveToLocalStorage();
        return { success: true, data: deletedAnime };
      } else {
        // Restore the deleted item and mark for sync
        this.localData.splice(index, 0, deletedAnime);
        this.storePendingChange('delete', { id });
        this.saveToLocalStorage();
        return { success: false, error: result.error };
      }
    } else {
      // Offline mode
      this.storePendingChange('delete', { id });
      this.saveToLocalStorage();
      return { success: true, data: deletedAnime, offline: true };
    }
  }

  // Store pending changes for sync when online
  storePendingChange(action, data) {
    const pendingChanges = this.getPendingChanges();
    pendingChanges.push({
      action,
      data,
      timestamp: Date.now()
    });
    localStorage.setItem('dongtube_pending_changes', JSON.stringify(pendingChanges));
    this.updateConnectionStatus();
  }

  getPendingChanges() {
    try {
      return JSON.parse(localStorage.getItem('dongtube_pending_changes') || '[]');
    } catch {
      return [];
    }
  }

  getPendingChangesCount() {
    return this.getPendingChanges().length;
  }

  // Sync pending changes when back online
  async syncPendingChanges() {
    const pendingChanges = this.getPendingChanges();
    if (pendingChanges.length === 0) return;

    themeManager?.showToast(`🔄 Syncing ${pendingChanges.length} pending changes...`, 'info');

    try {
      // For JSONBin, we just need to save the current state
      const result = await this.saveToJSONBin(this.localData);
      
      if (result.success) {
        // Clear pending changes
        localStorage.removeItem('dongtube_pending_changes');
        this.updateConnectionStatus();
        themeManager?.showToast('✅ All changes synced successfully!', 'success');
        
        // Reload fresh data from server
        await this.loadAnimeData();
      } else {
        themeManager?.showToast('⚠️ Sync failed, will retry later', 'warning');
      }
    } catch (error) {
      themeManager?.showToast('❌ Sync error: ' + error.message, 'error');
    }
  }

  // Save to localStorage (cache)
  saveToLocalStorage() {
    try {
      localStorage.setItem('dongtube_anime_data', JSON.stringify(this.localData));
      localStorage.setItem('dongtube_last_sync', new Date().toISOString());
    } catch (e) {
      console.warn('Could not save to localStorage');
    }
  }

  // Load from localStorage (cache)
  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('dongtube_anime_data');
      if (saved) {
        this.localData = JSON.parse(saved);
        return this.localData;
      }
    } catch (e) {
      console.warn('Could not load from localStorage');
    }
    
    // Return default data if no cache
    this.localData = this.getDefaultData();
    return this.localData;
  }

  // Default anime data
  getDefaultData() {
    return [
      {
        id: 1,
        title: "Overlord Movie 3",
        thumb: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9fDI0GaD5RkNRVZDDE86wEfL68tMB2u_zFwAPiRnWxv7yxoxObWNFsTd-&s=10",
        status: "Ongoing",
        year: 2024,
        genre: "Action, Fantasy",
        rating: 8.5,
        description: "The epic conclusion of the Overlord movie trilogy featuring Ainz Ooal Gown's ultimate conquest.",
        episodes: [
          {num: 1, src: "https://short.icu/4lZNVHkOJ", title: "The Final Battle Begins"},
          {num: 2, src: "https://www.w3schools.com/html/movie.mp4", title: "Supreme Overlord's Power"}
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        title: "Throne of Seal Movie: Electrolux Sub Indo",
        thumb: "https://static.wikia.nocookie.net/7374f95d-7da1-414e-8dd0-da3fbd832506/scale-to-width/755",
        status: "Complete",
        year: 2023,
        genre: "Adventure, Magic",
        rating: 7.8,
        description: "Follow the legendary journey of knights and their divine seals in this epic adventure.",
        episodes: [
          {num: 1, src: "https://ok.ru/videoembed/9975931079346", title: "The Electrolux Awakening"}
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
        },
            {
      id: 3,
      title: "Renegade Immortal",
      thumb: "https://anichin.moe/wp-content/uploads/2023/09/Renegade-Immortal-Subtitle-Indonesia-2.webp",
      status: "Ongoing",
      year: 2025,
      genre: "Action, Adventure, Drama, Fantasy, Cultivation, Supernatural",
      rating: 8.83,
      description: "Renegade Immortal mengikuti kisah Wang Lin, seorang pemuda yang bertekad menjadi immortal melalui latihan dan perjuangan di dunia penuh dewa, iblis, dan misteri. Setiap episode menampilkan pertarungan, strategi, dan perjalanan karakter dalam menguasai ilmu-ilmu tinggi serta menghadapi musuh yang kuat.",
      episodes: [
        { num: 1, src: "https://ok.ru/videoembed/6985057634994", title: "Episode 01 Subtitle Indonesia" },
        { num: 2, src: "https://ok.ru/videoembed/6985605253810", title: "Episode 02 Subtitle Indonesia" },
        { num: 3, src: "https://ok.ru/videoembed/6985967143602", title: "Episode 03 Subtitle Indonesia" },
        { num: 4, src: "https://ok.ru/videoembed/7008755780274", title: "Episode 04 Subtitle Indonesia" },
        { num: 5, src: "https://ok.ru/videoembed/7031128853170", title: "Episode 05 Subtitle Indonesia" },
        { num: 6, src: "https://ok.ru/videoembed/7053238274738", title: "Episode 06 Subtitle Indonesia" },
        { num: 7, src: "https://ok.ru/videoembed/7074748304050", title: "Episode 07 Subtitle Indonesia" },
        { num: 8, src: "https://ok.ru/videoembed/7098088295090", title: "Episode 08 Subtitle Indonesia" },
        { num: 9, src: "https://ok.ru/videoembed/7121948838578", title: "Episode 09 Subtitle Indonesia" },
        { num: 10, src: "https://ok.ru/videoembed/7144022608562", title: "Episode 10 Subtitle Indonesia" },
        { num: 11, src: "https://ok.ru/videoembed/7165937519282", title: "Episode 11 Subtitle Indonesia" },
        { num: 12, src: "https://ok.ru/videoembed/7190088387250", title: "Episode 12 Subtitle Indonesia" },
        { num: 13, src: "https://ok.ru/videoembed/7211507124914", title: "Episode 13 Subtitle Indonesia" },
        { num: 14, src: "https://ok.ru/videoembed/7232915835570", title: "Episode 14 Subtitle Indonesia" },
        { num: 15, src: "https://ok.ru/videoembed/7254497626802", title: "Episode 15 Subtitle Indonesia" },
        { num: 16, src: "https://ok.ru/videoembed/7277297142450", title: "Episode 16 Subtitle Indonesia" },
        { num: 17, src: "https://ok.ru/videoembed/7306501622450", title: "Episode 17 Subtitle Indonesia" },
        { num: 18, src: "https://ok.ru/videoembed/7330579483314", title: "Episode 18 Subtitle Indonesia" },
        { num: 19, src: "https://ok.ru/videoembed/7352783014578", title: "Episode 19 Subtitle Indonesia" },
        { num: 20, src: "https://ok.ru/videoembed/7375328053938", title: "Episode 20 Subtitle Indonesia" },
        { num: 21, src: "https://ok.ru/videoembed/7400505215666", title: "Episode 21 Subtitle Indonesia" },
        { num: 22, src: "https://ok.ru/videoembed/7421705521842", title: "Episode 22 Subtitle Indonesia" },
        { num: 23, src: "https://ok.ru/videoembed/7443390859954", title: "Episode 23 Subtitle Indonesia" },
        { num: 24, src: "https://ok.ru/videoembed/7470073711282", title: "Episode 24 Subtitle Indonesia" },
        { num: 25, src: "https://ok.ru/videoembed/7495122160306", title: "Episode 25 Subtitle Indonesia" },
        { num: 26, src: "https://ok.ru/videoembed/7518136961714", title: "Episode 26 Subtitle Indonesia" },
        { num: 27, src: "https://ok.ru/videoembed/7544429611698", title: "Episode 27 Subtitle Indonesia" },
        { num: 28, src: "https://ok.ru/videoembed/7567006108338", title: "Episode 28 Subtitle Indonesia" },
        { num: 29, src: "https://ok.ru/videoembed/7587284322994", title: "Episode 29 Subtitle Indonesia" },
        { num: 30, src: "https://ok.ru/videoembed/7607692364466", title: "Episode 30 Subtitle Indonesia" },
        { num: 31, src: "https://ok.ru/videoembed/7628165286578", title: "Episode 31 Subtitle Indonesia" },
        { num: 32, src: "https://ok.ru/videoembed/7648473320114", title: "Episode 32 Subtitle Indonesia" },
        { num: 33, src: "https://ok.ru/videoembed/7668537952946", title: "Episode 33 Subtitle Indonesia" },
        { num: 34, src: "https://ok.ru/videoembed/7690715073202", title: "Episode 34 Subtitle Indonesia" },
        { num: 35, src: "https://ok.ru/videoembed/7712891341490", title: "Episode 35 Subtitle Indonesia" },
        { num: 36, src: "https://ok.ru/videoembed/7734973500082", title: "Episode 36 Subtitle Indonesia" },
        { num: 37, src: "https://geo.dailymotion.com/player/xid0t.html?video=k7i5cspYMCqmatAGCmO", title: "Episode 37 Subtitle Indonesia" },
        { num: 38, src: "https://geo.dailymotion.com/player/xid0t.html?video=k6LsKVpEZ2MfAkAJkoQ", title: "Episode 38 Subtitle Indonesia" },
        { num: 39, src: "https://geo.dailymotion.com/player/xid0t.html?video=k2ms5Q9Ol31vqUAMb5m", title: "Episode 39 Subtitle Indonesia" },
        { num: 40, src: "https://geo.dailymotion.com/player/xid0t.html?video=k1R6erGnByddWZAPsh6", title: "Episode 40 Subtitle Indonesia" },
        { num: 41, src: "https://geo.dailymotion.com/player/xid0t.html?video=k26MTe7kht24DcASz9Y", title: "Episode 41 Subtitle Indonesia" },
        { num: 42, src: "https://geo.dailymotion.com/player/xid0t.html?video=k4ovj3zVnRIe09AV8Qg", title: "Episode 42 Subtitle Indonesia" },
        { num: 43, src: "https://geo.dailymotion.com/player/xid0t.html?video=k4uipAj1cGNrCyAXVoA", title: "Episode 43 Subtitle Indonesia" },
        { num: 44, src: "https://geo.dailymotion.com/player/xid0t.html?video=kFA3KhoiUejdsBB1hQC", title: "Episode 44 Subtitle Indonesia" },
        { num: 45, src: "https://geo.dailymotion.com/player/xid0t.html?video=k2CktUgJ3vwnjHB4yS2", title: "Episode 45 Subtitle Indonesia" },
        { num: 46, src: "https://geo.dailymotion.com/player/xid0t.html?video=k5qV5Rg42996h7B7Eie", title: "Episode 46 Subtitle Indonesia" },
        { num: 47, src: "https://geo.dailymotion.com/player/xid0t.html?video=k6ygYgLAknFtXnBb6IU", title: "Episode 47 Subtitle Indonesia" },
        { num: 48, src: "https://geo.dailymotion.com/player/xid0t.html?video=k19s6Fa9Upo703BdZzG", title: "Episode 48 Subtitle Indonesia" },
        { num: 49, src: "https://ok.ru/videoembed/9491234567890", title: "Episode 49 Subtitle Indonesia" },
        { num: 50, src: "https://ok.ru/videoembed/9492234567890", title: "Episode 50 Subtitle Indonesia" },
                { num: 51, src: "https://ok.ru/videoembed/9493234567890", title: "Episode 51 Subtitle Indonesia" },
        { num: 52, src: "https://ok.ru/videoembed/9494234567890", title: "Episode 52 Subtitle Indonesia" },
        { num: 53, src: "https://ok.ru/videoembed/9495234567890", title: "Episode 53 Subtitle Indonesia" },
        { num: 54, src: "https://ok.ru/videoembed/9496234567890", title: "Episode 54 Subtitle Indonesia" },
        { num: 55, src: "https://ok.ru/videoembed/9497234567890", title: "Episode 55 Subtitle Indonesia" },
        { num: 56, src: "https://ok.ru/videoembed/9498234567890", title: "Episode 56 Subtitle Indonesia" },
        { num: 57, src: "https://ok.ru/videoembed/9499234567890", title: "Episode 57 Subtitle Indonesia" },
        { num: 58, src: "https://ok.ru/videoembed/9500234567890", title: "Episode 58 Subtitle Indonesia" },
        { num: 59, src: "https://ok.ru/videoembed/9501234567890", title: "Episode 59 Subtitle Indonesia" },
        { num: 60, src: "https://ok.ru/videoembed/9502234567890", title: "Episode 60 Subtitle Indonesia" },
        { num: 61, src: "https://ok.ru/videoembed/9503234567890", title: "Episode 61 Subtitle Indonesia" },
        { num: 62, src: "https://geo.dailymotion.com/player/xid0t.html?video=k1UhPUIT6Qj8apBQgrG", title: "Episode 62 Subtitle Indonesia" },
        { num: 63, src: "https://geo.dailymotion.com/player/xid0t.html?video=kRvov2fT5eBBgUBSXze", title: "Episode 63 Subtitle Indonesia" },
        { num: 64, src: "https://geo.dailymotion.com/player/xid0t.html?video=k1JiER5kv8BeJeBVG8I", title: "Episode 64 Subtitle Indonesia" },
        { num: 65, src: "https://geo.dailymotion.com/player/xid0t.html?video=kLAIHzpVNTXJWFBYmXG", title: "Episode 65 Subtitle Indonesia" },
        { num: 66, src: "https://geo.dailymotion.com/player/xid0t.html?video=kChof6rHpfoq2XC11hw", title: "Episode 66 Subtitle Indonesia" },
        { num: 67, src: "https://geo.dailymotion.com/player/xid0t.html?video=k4iDrdtg4GaSbYC3JPW", title: "Episode 67 Subtitle Indonesia" },
        { num: 68, src: "https://geo.dailymotion.com/player/xid0t.html?video=k45ESNtiuomkTBC6lE2", title: "Episode 68 Subtitle Indonesia" },
        { num: 69, src: "https://ok.ru/videoembed/9525711145650", title: "Episode 69 Subtitle Indonesia" },
        { num: 70, src: "https://ok.ru/videoembed/9560732994226", title: "Episode 70 Subtitle Indonesia" },
        { num: 71, src: "https://ok.ru/videoembed/9592697391794", title: "Episode 71 Subtitle Indonesia" },
        { num: 72, src: "https://ok.ru/videoembed/9622584232626", title: "Episode 72 Subtitle Indonesia" },
        { num: 73, src: "https://ok.ru/videoembed/9647941552818", title: "Episode 73 Subtitle Indonesia" },
        { num: 74, src: "https://ok.ru/videoembed/9674856008370", title: "Episode 74 Subtitle Indonesia" },
        { num: 75, src: "https://ok.ru/videoembed/9700730800818", title: "Episode 75 Subtitle Indonesia" },
        { num: 76, src: "https://ok.ru/videoembed/9726302423730", title: "Episode 76 Subtitle Indonesia" },
        { num: 77, src: "https://ok.ru/videoembed/9749658340018", title: "Episode 77 Subtitle Indonesia" },
        { num: 78, src: "https://ok.ru/videoembed/9772214979250", title: "Episode 78 Subtitle Indonesia" },
        { num: 79, src: "https://ok.ru/videoembed/9795899230898", title: "Episode 79 Subtitle Indonesia" },
        { num: 80, src: "https://ok.ru/videoembed/9822063102642", title: "Episode 80 Subtitle Indonesia" },
        { num: 81, src: "https://ok.ru/videoembed/9844688030386", title: "Episode 81 Subtitle Indonesia" },
        { num: 82, src: "https://ok.ru/videoembed/9870836239026", title: "Episode 82 Subtitle Indonesia" },
        { num: 83, src: "https://ok.ru/videoembed/9894635899570", title: "Episode 83 Subtitle Indonesia" },
        { num: 84, src: "https://ok.ru/videoembed/9917886302898", title: "Episode 84 Subtitle Indonesia" },
        { num: 85, src: "https://ok.ru/videoembed/9941736557234", title: "Episode 85 Subtitle Indonesia" },
        { num: 86, src: "https://ok.ru/videoembed/9966113458866", title: "Episode 86 Subtitle Indonesia" },
        { num: 87, src: "https://ok.ru/videoembed/9988168551090", title: "Episode 87 Subtitle Indonesia" },
        { num: 88, src: "https://ok.ru/videoembed/10012577499826", title: "Episode 88 Subtitle Indonesia" },
        { num: 89, src: "https://ok.ru/videoembed/10030794017458", title: "Episode 89 Subtitle Indonesia" },
        { num: 90, src: "https://ok.ru/videoembed/10051699477170", title: "Episode 90 Subtitle Indonesia" },
        { num: 91, src: "https://ok.ru/videoembed/10071313615538", title: "Episode 91 Subtitle Indonesia" },
        { num: 92, src: "https://ok.ru/videoembed/10090519268018", title: "Episode 92 Subtitle Indonesia" },
        { num: 93, src: "https://ok.ru/videoembed/10111232641714", title: "Episode 93 Subtitle Indonesia" },
        { num: 94, src: "https://ok.ru/videoembed/10130178837170", title: "Episode 94 Subtitle Indonesia" },
        { num: 95, src: "https://ok.ru/videoembed/10148815178418", title: "Episode 95 Subtitle Indonesia" },
        { num: 96, src: "https://ok.ru/videoembed/10168507632306", title: "Episode 96 Subtitle Indonesia" },
        { num: 97, src: "https://ok.ru/videoembed/10187668523698", title: "Episode 97 Subtitle Indonesia" },
        { num: 98, src: "https://ok.ru/videoembed/10206167042738", title: "Episode 98 Subtitle Indonesia" },
        { num: 99, src: "https://ok.ru/videoembed/10225167829682", title: "Episode 99 Subtitle Indonesia" },
        { num: 100, src: "https://ok.ru/videoembed/10247964527282", title: "Episode 100 Subtitle Indonesia" },
        { num: 101, src: "https://ok.ru/videoembed/10267124107954", title: "Episode 101 Subtitle Indonesia" },
        { num: 102, src: "https://ok.ru/videoembed/10288124988082", title: "Episode 102 Subtitle Indonesia" },
        { num: 103, src: "https://ok.ru/videoembed/10311278529202", title: "Episode 103 Subtitle Indonesia" },
        { num: 104, src: "https://ok.ru/videoembed/10332792228530", title: "Episode 104 Subtitle Indonesia" },
        { num: 105, src: "https://ok.ru/videoembed/10355745229490", title: "Episode 105 Subtitle Indonesia" },
        { num: 106, src: "https://ok.ru/videoembed/10377513536178", title: "Episode 106 Subtitle Indonesia" }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}
      }
    ];
  }

  getCurrentData() {
    return this.localData;
  }

  getConnectionStatus() {
    return {
      online: this.isOnline,
      configured: this.binId !== '68c7fdc9d0ea881f407e85cc',
      hasPendingChanges: this.getPendingChangesCount() > 0,
      lastSync: localStorage.getItem('dongtube_last_sync')
    };
  }
}

// URL Router Class (unchanged)
class URLRouter {
  constructor() {
    this.baseURL = window.location.origin;
  }

  titleToSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  generateWatchURL(anime, episode = 1) {
    const slug = this.titleToSlug(anime.title);
    return `/watch/${slug}=id:${anime.id}&ep=${episode}`;
  }

  parseWatchURL() {
    const path = window.location.pathname;
    const search = window.location.search;
    
    const newFormatMatch = path.match(/\/watch\/(.+)=id:(\d+)(&ep=(\d+))?/);
    if (newFormatMatch) {
      return {
        animeId: parseInt(newFormatMatch[2]),
        episode: newFormatMatch[4] ? parseInt(newFormatMatch[4]) : 1
      };
    }
    
    const urlParams = new URLSearchParams(search);
    return {
      animeId: parseInt(urlParams.get('id')) || 1,
      episode: parseInt(urlParams.get('ep')) || 1
    };
  }

  updateURL(anime, episode) {
    const cleanURL = this.generateWatchURL(anime, episode);
    const title = `Watch ${anime.title} Episode ${episode} - DongTube`;
    
    window.history.pushState(
      { animeId: anime.id, episode }, 
      title, 
      cleanURL
    );
    
    document.title = title;
  }
}

// Theme Management (unchanged)
class ThemeManager {
  constructor() {
    this.currentTheme = localStorage.getItem('dongtube_theme') || 'dark';
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.bindEvents();
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeIcon = document.querySelector('#themeSwitcher');
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
    this.currentTheme = theme;
    localStorage.setItem('dongtube_theme', theme);
  }

  toggle() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    this.showToast(`Switched to ${newTheme} theme`, 'success');
  }

  bindEvents() {
    const themeSwitcher = document.getElementById('themeSwitcher');
    if (themeSwitcher) {
      themeSwitcher.addEventListener('click', () => this.toggle());
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || this.createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 3000);
  }

  createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }
}

// Enhanced Admin Panel with JSONBin Integration
class AdminPanel {
  constructor() {
    this.isAuthenticated = false;
    this.apiKey = 'hanzyy001';
    this.init();
  }

  init() {
    this.bindEvents();
    this.showConnectionStatus();
  }

  showConnectionStatus() {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'connectionStatus';
    statusDiv.className = 'connection-status';
    statusDiv.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 1001;
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-sm);
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
      backdrop-filter: var(--backdrop-blur);
    `;
    document.body.appendChild(statusDiv);
    
    this.updateConnectionStatus();
    setInterval(() => this.updateConnectionStatus(), 5000);
  }

  updateConnectionStatus() {
    if (dataManager) {
      dataManager.updateConnectionStatus();
    }
  }

  bindEvents() {
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
      adminBtn.addEventListener('click', () => this.showApiModal());
    }

    const apiForm = document.getElementById('apiForm');
    if (apiForm) {
      apiForm.addEventListener('submit', (e) => this.handleApiSubmit(e));
    }

    const cancelApi = document.getElementById('cancelApi');
    if (cancelApi) {
      cancelApi.addEventListener('click', () => this.hideApiModal());
    }

    const closeAdmin = document.getElementById('closeAdmin');
    if (closeAdmin) {
      closeAdmin.addEventListener('click', () => this.hideAdminModal());
    }

    const addAnimeForm = document.getElementById('addAnimeForm');
    if (addAnimeForm) {
      addAnimeForm.addEventListener('submit', (e) => this.handleAddAnime(e));
    }
  }

  showApiModal() {
    const modal = document.getElementById('apiModal');
    if (modal) {
      modal.style.display = 'flex';
      document.getElementById('apiKey').focus();
    }
  }

  hideApiModal() {
    const modal = document.getElementById('apiModal');
    if (modal) {
      modal.style.display = 'none';
      document.getElementById('apiKey').value = '';
    }
  }

  handleApiSubmit(e) {
    e.preventDefault();
    const inputKey = document.getElementById('apiKey').value;
    
    if (inputKey === this.apiKey) {
      this.isAuthenticated = true;
      this.hideApiModal();
      this.showAdminPanel();
      themeManager.showToast('✅ Admin access granted', 'success');
    } else {
      themeManager.showToast('❌ Invalid API key', 'error');
      document.getElementById('apiKey').value = '';
    }
  }

  showAdminPanel() {
    const modal = document.getElementById('adminModal');
    if (modal) {
      modal.style.display = 'flex';
      this.loadManageList();
    }
  }

  hideAdminModal() {
    const modal = document.getElementById('adminModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  async handleAddAnime(e) {
    e.preventDefault();
    
    // Check if JSONBin is configured
    const status = dataManager.getConnectionStatus();
    if (!status.configured) {
      themeManager.showToast('⚠️ Please configure JSONBin API first!\nEdit script.js and add your Bin ID & API Key', 'warning');
      return;
    }
    
    const formData = {
      title: document.getElementById('animeTitle').value,
      thumb: document.getElementById('animeThumb').value,
      status: document.getElementById('animeStatus').value,
      year: parseInt(document.getElementById('animeYear').value) || new Date().getFullYear(),
      genre: document.getElementById('animeGenre').value || 'Unknown',
      rating: parseFloat(document.getElementById('animeRating').value) || 7.0,
      description: document.getElementById('animeDescription').value || 'No description available'
    };

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving to JSONBin...';
    submitBtn.disabled = true;

    try {
      const result = await dataManager.addAnime(formData);
      
      if (result.success) {
        e.target.reset();
        this.loadManageList();
        
        if (indexController) {
          indexController.refreshAnimeList();
        }

        const message = result.offline ? 
          '📱 Anime saved offline. Will sync to JSONBin when online.' : 
          '✅ Anime saved to JSONBin successfully!';
        themeManager.showToast(message, 'success');
      } else {
        themeManager.showToast(`⚠️ Saved locally: ${result.error}`, 'warning');
      }
    } catch (error) {
      themeManager.showToast(`❌ Error: ${error.message}`, 'error');
    }

    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }

  async loadManageList() {
    const container = document.getElementById('animeManageList');
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading...</div>';

    try {
      const animeData = dataManager.getCurrentData();
      container.innerHTML = '';

      if (animeData.length === 0) {
        container.innerHTML = '<div class="no-data">No anime data found</div>';
        return;
      }

      animeData.forEach(anime => {
        const item = document.createElement('div');
        item.className = 'manage-item';
        
        const syncIcon = dataManager.getPendingChangesCount() > 0 ? '⏳' : '✅';
        
        item.innerHTML = `
          <div class="manage-item-info">
            <div class="manage-item-title">${syncIcon} ${anime.title}</div>
            <div class="manage-item-status">${anime.status} • ${anime.year} • ${anime.episodes?.length || 0} episodes</div>
          </div>
          <div class="manage-actions">
            <button class="manage-btn edit-btn" data-id="${anime.id}">Edit</button>
            <button class="manage-btn delete-btn" data-id="${anime.id}">Delete</button>
          </div>
        `;

        container.appendChild(item);
      });

      container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => this.editAnime(parseInt(e.target.dataset.id)));
      });

      container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => this.deleteAnime(parseInt(e.target.dataset.id)));
      });
    } catch (error) {
      container.innerHTML = '<div class="error">Error loading anime list</div>';
    }
  }

  editAnime(id) {
    const animeData = dataManager.getCurrentData();
    const anime = animeData.find(a => a.id === id);
    if (!anime) return;

    document.getElementById('animeTitle').value = anime.title;
    document.getElementById('animeThumb').value = anime.thumb;
    document.getElementById('animeStatus').value = anime.status;
    document.getElementById('animeYear').value = anime.year || '';
    document.getElementById('animeGenre').value = anime.genre || '';
    document.getElementById('animeRating').value = anime.rating || '';
    document.getElementById('animeDescription').value = anime.description || '';

    const form = document.getElementById('addAnimeForm');
    form.dataset.editId = id;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Update Anime';

    themeManager.showToast('📝 Editing anime...', 'info');
  }

  async deleteAnime(id) {
    if (!confirm('Are you sure you want to delete this anime from JSONBin?')) return;

    try {
      const result = await dataManager.deleteAnime(id);
      
      if (result.success) {
        this.loadManageList();
        
        if (indexController) {
          indexController.refreshAnimeList();
        }
        
        const message = result.offline ? 
          '📱 Anime deleted offline. Will sync to JSONBin when online.' : 
          '✅ Anime deleted from JSONBin successfully!';
        themeManager.showToast(message, 'success');
      } else {
        themeManager.showToast(`❌ Failed to delete: ${result.error}`, 'error');
      }
    } catch (error) {
      themeManager.showToast(`❌ Error: ${error.message}`, 'error');
    }
  }
}

// Index Page Controller
class IndexController {
  constructor() {
    this.animeList = document.getElementById('animeList');
    this.searchInput = document.getElementById('searchInput');
    this.filterSelect = document.getElementById('filterSelect');
    this.sortSelect = document.getElementById('sortSelect');
    this.resetBtn = document.getElementById('resetBtn');
    this.skeletonWrapper = document.getElementById('skeletonWrapper');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.resultCount = document.getElementById('resultCount');
    this.noResults = document.getElementById('noResults');
    
    this.currentData = [];
    this.isGridView = true;
    this.isLoading = false;

    if (this.animeList) {
      this.init();
    }
  }

  async init() {
    this.bindEvents();
    this.showLoading();
    
    // Load data from JSONBin
    this.currentData = await dataManager.loadAnimeData();
    this.updateStats();
    
    this.hideLoading();
    this.renderAnimeList(this.currentData);
  }

  bindEvents() {
    if (this.searchInput) {
      this.searchInput.addEventListener('input', this.debounce(() => {
        this.filterAndSearch();
      }, 300));
    }

    if (this.filterSelect) {
      this.filterSelect.addEventListener('change', () => this.filterAndSearch());
    }

    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', () => this.filterAndSearch());
    }

    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => this.resetFilters());
    }

    const gridViewBtn = document.getElementById('gridView');
    const listViewBtn = document.getElementById('listView');
    
    if (gridViewBtn && listViewBtn) {
      gridViewBtn.addEventListener('click', () => this.toggleView('grid'));
      listViewBtn.addEventListener('click', () => this.toggleView('list'));
    }
  }

  showLoading() {
    this.isLoading = true;
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'flex';
    }
    if (this.skeletonWrapper) {
      this.renderSkeleton(6);
    }
    if (this.animeList) {
      this.animeList.style.display = 'none';
    }
  }

  hideLoading() {
    this.isLoading = false;
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'none';
    }
    if (this.skeletonWrapper) {
      this.skeletonWrapper.innerHTML = '';
    }
    if (this.animeList) {
      this.animeList.style.display = 'grid';
    }
  }

  renderSkeleton(count = 6) {
    if (!this.skeletonWrapper) return;
    
    this.skeletonWrapper.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton';
      this.skeletonWrapper.appendChild(skeleton);
    }
  }

  renderAnimeList(data) {
    if (!this.animeList) return;

    this.animeList.innerHTML = '';
    this.updateResultCount(data.length);

    if (data.length === 0) {
      this.showNoResults();
      return;
    }

    this.hideNoResults();

    data.forEach((anime, index) => {
      const card = this.createAnimeCard(anime);
      card.style.animationDelay = `${index * 0.1}s`;
      this.animeList.appendChild(card);
    });

    this.animeList.className = this.isGridView ? 'anime-grid' : 'anime-grid list-view';
  }

  createAnimeCard(anime) {
    const card = document.createElement('a');
    card.className = 'card';
    card.dataset.animeId = anime.id;
    
    if (urlRouter) {
      card.href = urlRouter.generateWatchURL(anime, 1);
    } else {
      card.href = `watch.html?id=${anime.id}`;
    }
    
    const statusClass = anime.status.toLowerCase() === 'ongoing' ? 'status-ongoing' : 'status-complete';
    
    card.innerHTML = `
      <img src="${anime.thumb}" alt="${anime.title}" loading="lazy" 
           onerror="this.src='https://via.placeholder.com/300x400/1a1f3a/00d4ff?text=No+Image'">
      <div class="info">
        <div class="title">${anime.title}</div>
        <div class="status">
          <span class="status-badge ${statusClass}">${anime.status}</span>
          ${anime.year ? `<span class="year">${anime.year}</span>` : ''}
        </div>
        ${anime.rating ? `<div class="rating">⭐ ${anime.rating}</div>` : ''}
      </div>
    `;

    return card;
  }

  filterAndSearch() {
    this.showLoading();
    
    setTimeout(() => {
      const query = this.searchInput?.value.toLowerCase() || '';
      const status = this.filterSelect?.value || 'all';
      const sort = this.sortSelect?.value || 'title';

      const allData = dataManager.getCurrentData();
      let filtered = allData.filter(anime => {
        const matchesSearch = anime.title.toLowerCase().includes(query) ||
                            (anime.genre && anime.genre.toLowerCase().includes(query)) ||
                            (anime.description && anime.description.toLowerCase().includes(query));
        const matchesStatus = status === 'all' || anime.status === status;
        return matchesSearch && matchesStatus;
      });

      filtered = this.sortData(filtered, sort);

      this.currentData = filtered;
      this.hideLoading();
      this.renderAnimeList(filtered);
    }, 300);
  }

  sortData(data, sortBy) {
    switch (sortBy) {
      case 'title':
        return data.sort((a, b) => a.title.localeCompare(b.title));
      case 'status':
        return data.sort((a, b) => a.status.localeCompare(b.status));
      case 'year':
        return data.sort((a, b) => (b.year || 0) - (a.year || 0));
      default:
        return data;
    }
  }

  resetFilters() {
    if (this.searchInput) this.searchInput.value = '';
    if (this.filterSelect) this.filterSelect.value = 'all';
    if (this.sortSelect) this.sortSelect.value = 'title';
    
    this.currentData = dataManager.getCurrentData();
    this.renderAnimeList(this.currentData);
    
    themeManager.showToast('Filters reset', 'success');
  }

  toggleView(viewType) {
    this.isGridView = viewType === 'grid';
    
    const gridBtn = document.getElementById('gridView');
    const listBtn = document.getElementById('listView');
    
    if (gridBtn && listBtn) {
      gridBtn.classList.toggle('active', this.isGridView);
      listBtn.classList.toggle('active', !this.isGridView);
    }
    
    this.renderAnimeList(this.currentData);
  }

  updateResultCount(count) {
    if (this.resultCount) {
      this.resultCount.textContent = count;
    }
  }

  showNoResults() {
    if (this.noResults) {
      this.noResults.style.display = 'block';
    }
  }

  hideNoResults() {
    if (this.noResults) {
      this.noResults.style.display = 'none';
    }
  }

  updateStats() {
    const animeCountEl = document.getElementById('animeCount');
    if (animeCountEl) {
      const totalAnime = dataManager.getCurrentData().length;
      this.countUp(animeCountEl, totalAnime, 1500);
    }
  }

  countUp(element, target, duration = 1500) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      element.textContent = Math.floor(current);
      
      if (current >= target) {
        element.textContent = target;
        clearInterval(timer);
      }
    }, 16);
  }

  async refreshAnimeList() {
    this.showLoading();
    this.currentData = await dataManager.loadAnimeData();
    this.updateStats();
    this.hideLoading();
    this.renderAnimeList(this.currentData);
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Watch Page Controller
class WatchController {
  constructor() {
    this.videoPlayer = document.getElementById('videoPlayer');
    this.episodesEl = document.getElementById('episodes');
    this.prevBtn = document.getElementById('prevEp');
    this.nextBtn = document.getElementById('nextEp');
    this.animeTitleEl = document.getElementById('animeTitle');
    this.nowPlayingEl = document.getElementById('nowPlaying');
    this.animeDetailsEl = document.getElementById('animeDetails');
    this.episodeCountEl = document.getElementById('episodeCount');
    
    this.currentAnime = null;
    this.currentEpisodeIndex = 0;

    if (this.videoPlayer && this.episodesEl) {
      this.init();
    }
  }

  async init() {
    // Ensure data is loaded
    await dataManager.loadAnimeData();
    this.loadAnimeData();
    this.bindEvents();
  }

  loadAnimeData() {
    if (urlRouter) {
      const params = urlRouter.parseWatchURL();
      this.loadSpecificAnime(params.animeId, params.episode);
    } else {
      const params = new URLSearchParams(window.location.search);
      const animeId = parseInt(params.get('id')) || 1;
      const episodeNum = parseInt(params.get('ep')) || 1;
      this.loadSpecificAnime(animeId, episodeNum);
    }
  }

  loadSpecificAnime(animeId, episode) {
    const animeData = dataManager.getCurrentData();
    this.currentAnime = animeData.find(a => a.id === animeId);
    this.currentEpisodeIndex = Math.max(0, episode - 1);

    if (!this.currentAnime) {
      this.showError('Anime not found');
      return;
    }

    this.renderAnimeDetails();
    this.renderEpisodeList();
    this.loadEpisode(this.currentEpisodeIndex);
  }

  renderAnimeDetails() {
    if (!this.currentAnime || !this.animeDetailsEl) return;

    if (this.animeTitleEl) {
      this.animeTitleEl.textContent = this.currentAnime.title;
    }

    if (this.episodeCountEl) {
      this.episodeCountEl.textContent = `(${this.currentAnime.episodes?.length || 0})`;
    }

    const statusClass = this.currentAnime.status.toLowerCase() === 'ongoing' ? 'status-ongoing' : 'status-complete';
    
    this.animeDetailsEl.innerHTML = `
      <img src="${this.currentAnime.thumb}" alt="${this.currentAnime.title}" loading="lazy"
           onerror="this.src='https://via.placeholder.com/300x400/1a1f3a/00d4ff?text=No+Image'">
      <div class="title">${this.currentAnime.title}</div>
      <div class="status">
        <span class="status-badge ${statusClass}">${this.currentAnime.status}</span>
      </div>
      ${this.currentAnime.genre ? `<div class="genre">📂 ${this.currentAnime.genre}</div>` : ''}
      ${this.currentAnime.year ? `<div class="year">📅 ${this.currentAnime.year}</div>` : ''}
      ${this.currentAnime.rating ? `<div class="rating">⭐ ${this.currentAnime.rating}/10</div>` : ''}
      ${this.currentAnime.description ? `<div class="description">${this.currentAnime.description}</div>` : ''}
    `;
  }

  renderEpisodeList() {
    if (!this.currentAnime || !this.episodesEl) return;

    this.episodesEl.innerHTML = '';

    if (!this.currentAnime.episodes || this.currentAnime.episodes.length === 0) {
      this.episodesEl.innerHTML = '<div class="no-episodes">No episodes available</div>';
      return;
    }
    
    this.currentAnime.episodes.forEach((episode, index) => {
      const episodeEl = document.createElement('div');
      episodeEl.className = 'episode';
      episodeEl.innerHTML = `
        <div class="ep-number">EP ${episode.num}</div>
        ${episode.title ? `<div class="ep-title">${episode.title}</div>` : ''}
      `;
      
      episodeEl.addEventListener('click', () => this.loadEpisode(index));
      this.episodesEl.appendChild(episodeEl);
    });
  }

  loadEpisode(index) {
    if (!this.currentAnime || !this.currentAnime.episodes || 
        index < 0 || index >= this.currentAnime.episodes.length) return;

    this.currentEpisodeIndex = index;
    const episode = this.currentAnime.episodes[index];
    
    this.showPlayerLoading();
    
    setTimeout(() => {
      if (this.videoPlayer) {
        this.videoPlayer.src = episode.src;
      }
      
      if (this.nowPlayingEl) {
        const title = episode.title || `Episode ${episode.num}`;
        this.nowPlayingEl.textContent = title;
      }
      
      this.updateActiveEpisode();
      this.updateNavigationButtons();
      this.updateURL();
      this.hidePlayerLoading();
      
      this.videoPlayer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
    }, 1000);
  }

  updateActiveEpisode() {
    document.querySelectorAll('.episode').forEach((el, index) => {
      el.classList.toggle('active', index === this.currentEpisodeIndex);
    });
  }

  updateNavigationButtons() {
    if (this.prevBtn) {
      this.prevBtn.disabled = this.currentEpisodeIndex <= 0;
    }
    
    if (this.nextBtn) {
      const episodeCount = this.currentAnime.episodes?.length || 0;
      this.nextBtn.disabled = this.currentEpisodeIndex >= episodeCount - 1;
    }
  }

  updateURL() {
    const episode = this.currentEpisodeIndex + 1;
    
    if (urlRouter) {
      urlRouter.updateURL(this.currentAnime, episode);
    } else {
      const newURL = `watch.html?id=${this.currentAnime.id}&ep=${episode}`;
      window.history.pushState({}, '', newURL);
    }
  }

  showPlayerLoading() {
    const loading = document.getElementById('playerLoading');
    if (loading) {
      loading.style.display = 'flex';
    }
  }

  hidePlayerLoading() {
    const loading = document.getElementById('playerLoading');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  bindEvents() {
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => {
        if (this.currentEpisodeIndex > 0) {
          this.loadEpisode(this.currentEpisodeIndex - 1);
        }
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        const episodeCount = this.currentAnime.episodes?.length || 0;
        if (this.currentEpisodeIndex < episodeCount - 1) {
          this.loadEpisode(this.currentEpisodeIndex + 1);
        }
      });
    }

    const favoriteBtn = document.getElementById('favoriteBtn');
    const shareBtn = document.getElementById('shareBtn');

    if (favoriteBtn) {
      favoriteBtn.addEventListener('click', () => {
        favoriteBtn.classList.toggle('active');
        const isActive = favoriteBtn.classList.contains('active');
        themeManager.showToast(isActive ? '❤️ Added to favorites' : '💔 Removed from favorites', 'success');
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (navigator.share) {
          navigator.share({
            title: this.currentAnime.title,
            url: window.location.href
          });
        } else {
          navigator.clipboard.writeText(window.location.href).then(() => {
            themeManager.showToast('🔗 Link copied to clipboard', 'success');
          });
        }
      });
    }

    this.bindKeyboardShortcuts();
  }

  bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (this.currentEpisodeIndex > 0) {
            this.loadEpisode(this.currentEpisodeIndex - 1);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          const episodeCount = this.currentAnime.episodes?.length || 0;
          if (this.currentEpisodeIndex < episodeCount - 1) {
            this.loadEpisode(this.currentEpisodeIndex + 1);
          }
          break;
      }
    });
  }

  showError(message) {
    themeManager.showToast(message, 'error');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 3000);
  }
}

// Initialize Application
let themeManager;
let urlRouter;
let adminPanel;
let indexController;
let watchController;
let dataManager; // JSONBin manager

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize JSONBin data manager first
  dataManager = new JSONBinManager();
  
  // Initialize URL router
  urlRouter = new URLRouter();
  
  // Initialize theme manager
  themeManager = new ThemeManager();
  
  // Initialize admin panel
  adminPanel = new AdminPanel();
  
  // Initialize appropriate controller based on page
  if (document.getElementById('animeList')) {
    indexController = new IndexController();
  } else if (document.getElementById('videoPlayer')) {
    watchController = new WatchController();
  }
});

// Handle browser navigation
window.addEventListener('popstate', (event) => {
  if (watchController && event.state) {
    watchController.loadSpecificAnime(event.state.animeId, event.state.episode);
  }
});

// Modal close on outside click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});

// Handle form submission for editing anime
document.addEventListener('submit', async (e) => {
  if (e.target.id === 'addAnimeForm') {
    const editId = e.target.dataset.editId;
    if (editId) {
      e.preventDefault();
      
      const formData = {
        title: document.getElementById('animeTitle').value,
        thumb: document.getElementById('animeThumb').value,
        status: document.getElementById('animeStatus').value,
        year: parseInt(document.getElementById('animeYear').value) || new Date().getFullYear(),
        genre: document.getElementById('animeGenre').value,
        rating: parseFloat(document.getElementById('animeRating').value) || 7.0,
        description: document.getElementById('animeDescription').value
      };

      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.textContent = 'Updating...';
      submitBtn.disabled = true;

      try {
        const result = await dataManager.updateAnime(parseInt(editId), formData);
        
        if (result.success) {
          e.target.reset();
          delete e.target.dataset.editId;
          submitBtn.textContent = 'Add Anime';
          
          adminPanel.loadManageList();
          if (indexController) {
            indexController.refreshAnimeList();
          }
          
          const message = result.offline ? 
            '📱 Anime updated offline. Will sync to JSONBin when online.' : 
            '✅ Anime updated in JSONBin successfully!';
          themeManager.showToast(message, 'success');
        } else {
          themeManager.showToast(`⚠️ Updated locally: ${result.error}`, 'warning');
        }
      } catch (error) {
        themeManager.showToast(`❌ Error: ${error.message}`, 'error');
      }

      submitBtn.textContent = 'Add Anime';
      submitBtn.disabled = false;
    }
  }
});