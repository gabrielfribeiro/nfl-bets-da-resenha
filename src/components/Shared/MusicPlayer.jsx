import { useState, useEffect, useRef, useCallback } from "react";

const FALLBACK_PLAYLIST = [
  {
    id: "track-0-pagode-da-resenha-mp3",
    filename: "pagode-da-resenha.mp3",
    title: "Pagode Da Resenha",
    emoji: "🪕",
    src: "/audio/pagode-da-resenha.mp3",
  },
];

export default function MusicPlayer() {
  const audioRef = useRef(null);
  const [playlist, setPlaylist] = useState(FALLBACK_PLAYLIST);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("resenha_music_volume");
    return saved !== null ? parseFloat(saved) : 0.35;
  });
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem("resenha_music_muted") === "true";
  });
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);

  const userPausedRef = useRef(
    localStorage.getItem("resenha_music_paused") === "true"
  );
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const menuRef = useRef(null);

  // Busca lista de músicas da pasta public/audio
  const fetchPlaylist = useCallback(async () => {
    try {
      const res = await fetch(`/audio/playlist.json?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setPlaylist(data);

          // Restaura última música selecionada salva
          const savedId = localStorage.getItem("resenha_music_track_id");
          if (savedId) {
            const idx = data.findIndex((t) => t.id === savedId || t.filename === savedId);
            if (idx !== -1) {
              setCurrentIndex(idx);
            }
          }
        }
      }
    } catch {
      // Usa fallback padrão
    }
  }, []);

  // Carrega playlist ao montar
  useEffect(() => {
    fetchPlaylist();

    // Hot Module Reload para quando novos áudios forem adicionados no dev
    if (import.meta.hot) {
      import.meta.hot.on("audio-playlist-updated", (updated) => {
        if (Array.isArray(updated) && updated.length > 0) {
          setPlaylist(updated);
        }
      });
    }
  }, [fetchPlaylist]);

  // Inicializa o elemento de áudio
  useEffect(() => {
    const audio = new Audio();
    audio.volume = isMuted ? 0 : volume;
    audioRef.current = audio;

    // Quando a música termina, toca a próxima automaticamente
    const handleEnded = () => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % playlist.length;
        return next;
      });
    };

    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audio.src = "";
    };
  }, []); // eslint-disable-line

  // Atualiza a fonte do áudio quando muda de faixa ou a playlist atualiza
  const currentTrack = playlist[currentIndex] || playlist[0] || FALLBACK_PLAYLIST[0];

  useEffect(() => {
    if (!audioRef.current || !currentTrack?.src) return;

    const currentSrc = audioRef.current.getAttribute("src");
    if (currentSrc !== currentTrack.src) {
      audioRef.current.src = currentTrack.src;
      audioRef.current.volume = isMuted ? 0 : volume;

      if (currentTrack.id) {
        localStorage.setItem("resenha_music_track_id", currentTrack.id);
      }

      // Se estava tocando antes ou não foi pausado pelo usuário, continua tocando
      if (!userPausedRef.current) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay bloqueado pelo navegador antes do 1º clique
            setIsPlaying(false);
            const handleFirstGesture = () => {
              if (!userPausedRef.current && audioRef.current) {
                audioRef.current
                  .play()
                  .then(() => setIsPlaying(true))
                  .catch(() => {});
              }
              window.removeEventListener("click", handleFirstGesture);
              window.removeEventListener("touchstart", handleFirstGesture);
            };
            window.addEventListener("click", handleFirstGesture, { once: true });
            window.addEventListener("touchstart", handleFirstGesture, { once: true });
          });
      }
    }
  }, [currentTrack, isMuted, volume]);

  // Sincroniza volume e mudo
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    localStorage.setItem("resenha_music_volume", volume.toString());
    localStorage.setItem("resenha_music_muted", isMuted.toString());
  }, [volume, isMuted]);

  // Fecha menus ao clicar fora
  useEffect(() => {
    if (!showPlaylistMenu && !showMobileControls) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowPlaylistMenu(false);
        setShowMobileControls(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showPlaylistMenu, showMobileControls]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      userPausedRef.current = true;
      localStorage.setItem("resenha_music_paused", "true");
    } else {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          userPausedRef.current = false;
          localStorage.removeItem("resenha_music_paused");
        })
        .catch((err) => {
          console.error("Erro ao reproduzir áudio:", err);
        });
    }
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    if (playlist.length <= 1) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      return;
    }
    userPausedRef.current = false;
    localStorage.removeItem("resenha_music_paused");
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
  };

  const handlePrev = (e) => {
    e?.stopPropagation();
    if (playlist.length <= 1) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      return;
    }
    userPausedRef.current = false;
    localStorage.removeItem("resenha_music_paused");
    setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
  };

  const selectTrack = (index) => {
    userPausedRef.current = false;
    localStorage.removeItem("resenha_music_paused");
    setCurrentIndex(index);
    setShowPlaylistMenu(false);
    setShowMobileControls(false);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (volume === 0) setVolume(0.35);
    } else {
      setIsMuted(true);
    }
  };

  const currentVolPct = Math.round((isMuted ? 0 : volume) * 100);

  return (
    <div className="relative flex items-center" ref={menuRef}>
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* DESKTOP PLAYER */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex items-center gap-2 h-11 px-3 bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-950 border border-amber-400/30 hover:border-amber-400/60 rounded-xl shadow-inner transition-all">
        {/* Prev Track (se tiver mais de 1 música) */}
        {playlist.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            title="Música anterior"
            className="w-6 h-6 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 flex items-center justify-center text-[10px] transition-colors"
          >
            ⏮
          </button>
        )}

        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          title={isPlaying ? "Pausar" : "Tocar"}
          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs transition-all active:scale-90 flex-shrink-0 ${
            isPlaying
              ? "bg-amber-400 text-gray-950 shadow-md shadow-amber-400/20"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
          }`}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        {/* Next Track (se tiver mais de 1 música) */}
        {playlist.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            title="Próxima música"
            className="w-6 h-6 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 flex items-center justify-center text-[10px] transition-colors"
          >
            ⏭
          </button>
        )}

        {/* Track Title & Equalizer Button (abre menu de faixas) */}
        <button
          type="button"
          onClick={() => {
            fetchPlaylist();
            setShowPlaylistMenu(!showPlaylistMenu);
          }}
          title="Clique para ver a lista de músicas da Resenha"
          className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-gray-800/80 transition-colors text-left max-w-[170px]"
        >
          <span className="text-xs flex-shrink-0">{currentTrack.emoji || "🎵"}</span>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-black text-amber-300 tracking-wide truncate">
                {currentTrack.title}
              </span>
              {playlist.length > 1 && (
                <span className="text-[8px] bg-amber-400/20 text-amber-300 px-1 rounded font-black flex-shrink-0">
                  {currentIndex + 1}/{playlist.length}
                </span>
              )}
            </div>
            <span className="text-[9px] text-gray-400 font-semibold leading-none">
              {isPlaying ? "Tocando agora" : "Pausado"}
            </span>
          </div>

          {/* Animated Equalizer */}
          <div className="flex items-end gap-[2px] h-3 ml-1 flex-shrink-0">
            <span
              className={`w-[2.5px] bg-amber-400 rounded-full transition-all duration-300 ${
                isPlaying ? "animate-pulse h-3" : "h-1 opacity-40"
              }`}
            />
            <span
              className={`w-[2.5px] bg-amber-400 rounded-full transition-all duration-500 delay-75 ${
                isPlaying ? "animate-pulse h-2" : "h-1 opacity-40"
              }`}
            />
            <span
              className={`w-[2.5px] bg-amber-400 rounded-full transition-all duration-300 delay-150 ${
                isPlaying ? "animate-pulse h-3.5" : "h-1 opacity-40"
              }`}
            />
            <span
              className={`w-[2.5px] bg-amber-400 rounded-full transition-all duration-400 delay-100 ${
                isPlaying ? "animate-pulse h-2" : "h-1 opacity-40"
              }`}
            />
          </div>
        </button>

        {/* Divider */}
        <span className="w-px h-5 bg-gray-800" />

        {/* Volume & Mute */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? "Desmutar" : "Mutar"}
            className="text-gray-400 hover:text-white text-xs transition-colors p-0.5"
          >
            {isMuted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-14 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            title={`Volume: ${currentVolPct}%`}
          />
          <span className="text-[10px] font-bold text-gray-400 w-6 text-right tabular-nums">
            {currentVolPct}%
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* DESKTOP PLAYLIST DROPDOWN */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {showPlaylistMenu && (
        <div className="hidden lg:block absolute top-14 left-0 z-50 bg-gray-900 border border-gray-700 shadow-2xl rounded-2xl p-3 w-72 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-800">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>📻</span>
              <span>Rádio da Resenha ({playlist.length})</span>
            </span>
            <span className="text-[10px] text-gray-500 font-semibold">
              public/audio
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-thin">
            {playlist.map((track, idx) => {
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={track.id || idx}
                  type="button"
                  onClick={() => selectTrack(idx)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left transition-all text-xs ${
                    isCurrent
                      ? "bg-amber-400 text-gray-950 font-black shadow"
                      : "hover:bg-gray-800 text-gray-300 font-bold"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">{track.emoji || "🎵"}</span>
                    <span className="truncate">{track.title}</span>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-black uppercase tracking-wider flex-shrink-0">
                      {isPlaying ? "▶ Tocando" : "⏸"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 pt-2 border-t border-gray-800 text-[10px] text-gray-400 text-center">
            💡 Basta colar novos arquivos .mp3 na pasta <strong>public/audio</strong>!
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MOBILE / TABLET COMPACT BUTTON */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="flex lg:hidden items-center">
        <button
          type="button"
          onClick={() => {
            fetchPlaylist();
            setShowMobileControls(!showMobileControls);
          }}
          title="Rádio da Resenha"
          className={`h-11 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all text-xs font-black ${
            isPlaying
              ? "bg-amber-400/15 border-amber-400/40 text-amber-300"
              : "bg-gray-900/90 border-gray-800 text-gray-400"
          }`}
        >
          <span className="text-sm">{currentTrack.emoji || "🪕"}</span>
          {isPlaying && (
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
          )}
          <span className="text-xs">{isMuted || volume === 0 ? "🔇" : "🔊"}</span>
        </button>

        {/* Mobile Popover Controls & Playlist */}
        {showMobileControls && (
          <div className="absolute top-14 right-0 z-50 bg-gray-900 border border-gray-700 shadow-2xl rounded-2xl p-4 w-72 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Track Info */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">{currentTrack.emoji || "🎵"}</span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-amber-400 truncate">
                    {currentTrack.title}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {isPlaying ? "Tocando agora" : "Pausado"}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-gray-500">
                {currentIndex + 1}/{playlist.length}
              </span>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-4 my-3">
              {playlist.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-8 h-8 rounded-full bg-gray-800 text-gray-300 hover:text-white flex items-center justify-center text-xs"
                >
                  ⏮
                </button>
              )}
              <button
                type="button"
                onClick={togglePlay}
                className="px-4 py-2 rounded-xl bg-amber-400 text-gray-950 font-black text-xs flex items-center gap-1.5 shadow"
              >
                <span>{isPlaying ? "⏸ Pausar" : "▶ Tocar"}</span>
              </button>
              {playlist.length > 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-8 h-8 rounded-full bg-gray-800 text-gray-300 hover:text-white flex items-center justify-center text-xs"
                >
                  ⏭
                </button>
              )}
            </div>

            {/* Volume Slider */}
            <div className="bg-gray-950/80 p-2.5 rounded-xl border border-gray-800 mb-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
                <span>{isMuted || volume === 0 ? "🔇 Mudo" : "🔊 Volume"}</span>
                <span className="text-amber-400 tabular-nums">{currentVolPct}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  {isMuted || volume === 0 ? "🔇" : "🔉"}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>
            </div>

            {/* Playlist Track List */}
            {playlist.length > 1 && (
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                  Músicas Disponíveis:
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
                  {playlist.map((track, idx) => {
                    const isCurrent = idx === currentIndex;
                    return (
                      <button
                        key={track.id || idx}
                        type="button"
                        onClick={() => selectTrack(idx)}
                        className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                          isCurrent
                            ? "bg-amber-400/20 text-amber-300 font-black border border-amber-400/40"
                            : "hover:bg-gray-800 text-gray-300 font-bold"
                        }`}
                      >
                        <span className="truncate flex items-center gap-1.5">
                          <span>{track.emoji || "🎵"}</span>
                          <span>{track.title}</span>
                        </span>
                        {isCurrent && <span className="text-[10px]">▶</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
