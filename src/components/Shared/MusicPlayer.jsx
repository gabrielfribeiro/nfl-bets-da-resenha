import { useState, useEffect, useRef } from "react";

export default function MusicPlayer() {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("resenha_music_volume");
    return saved !== null ? parseFloat(saved) : 0.35;
  });
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem("resenha_music_muted") === "true";
  });
  const [showVolumePopup, setShowVolumePopup] = useState(false);
  const userPausedRef = useRef(
    localStorage.getItem("resenha_music_paused") === "true"
  );
  const popupRef = useRef(null);

  // Inicializa o áudio
  useEffect(() => {
    const audio = new Audio("/audio/pagode-da-resenha.mp3");
    audio.loop = true;
    audio.volume = isMuted ? 0 : volume;
    audioRef.current = audio;

    // Se o usuário não tinha pausado intencionalmente antes, tenta dar play
    if (!userPausedRef.current) {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // Bloqueado pela política de Autoplay do navegador (exige interação)
          setIsPlaying(false);
          const handleFirstClick = () => {
            if (!userPausedRef.current && audioRef.current) {
              audioRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => {});
            }
            window.removeEventListener("click", handleFirstClick);
            window.removeEventListener("touchstart", handleFirstClick);
          };

          window.addEventListener("click", handleFirstClick, { once: true });
          window.addEventListener("touchstart", handleFirstClick, { once: true });
        });
    }

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Sincroniza volume e mudo
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    localStorage.setItem("resenha_music_volume", volume.toString());
    localStorage.setItem("resenha_music_muted", isMuted.toString());
  }, [volume, isMuted]);

  // Fecha popup ao clicar fora
  useEffect(() => {
    if (!showVolumePopup) return;
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setShowVolumePopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showVolumePopup]);

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
    <div className="relative flex items-center" ref={popupRef}>
      {/* DESKTOP PLAYER */}
      <div className="hidden lg:flex items-center gap-2.5 h-11 px-3.5 bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-950 border border-amber-400/30 hover:border-amber-400/60 rounded-xl shadow-inner transition-all">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          title={isPlaying ? "Pausar Pagode da Resenha" : "Tocar Pagode da Resenha"}
          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs transition-all active:scale-90 ${
            isPlaying
              ? "bg-amber-400 text-gray-950 shadow-md shadow-amber-400/20"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
          }`}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        {/* Title & Equalizer visualizer */}
        <div className="flex items-center gap-1.5 cursor-pointer" onClick={togglePlay}>
          <span className="text-xs">🪕</span>
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-amber-300 tracking-wide uppercase leading-tight line-clamp-1">
              Pagode da Resenha
            </span>
            <span className="text-[9px] text-gray-400 font-semibold leading-none">
              {isPlaying ? "Tocando agora..." : "Pausado"}
            </span>
          </div>

          {/* Animated Equalizer */}
          <div className="flex items-end gap-[2px] h-3 ml-1">
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
        </div>

        {/* Divider */}
        <span className="w-px h-5 bg-gray-800" />

        {/* Volume & Mute */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? "Desmutar" : "Mutar"}
            className="text-gray-400 hover:text-white text-xs transition-colors"
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
            className="w-16 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            title={`Volume: ${currentVolPct}%`}
          />
          <span className="text-[10px] font-bold text-gray-400 w-6 text-right tabular-nums">
            {currentVolPct}%
          </span>
        </div>
      </div>

      {/* MOBILE / TABLET COMPACT BUTTON */}
      <div className="flex lg:hidden items-center">
        <button
          type="button"
          onClick={() => setShowVolumePopup(!showVolumePopup)}
          title="Pagode da Resenha"
          className={`h-11 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all text-xs font-black ${
            isPlaying
              ? "bg-amber-400/10 border-amber-400/40 text-amber-300"
              : "bg-gray-900/90 border-gray-800 text-gray-400"
          }`}
        >
          <span className="text-sm">🪕</span>
          {/* Animated mini dots */}
          {isPlaying && (
            <span className="flex items-end gap-[1.5px] h-2.5">
              <span className="w-1 bg-amber-400 rounded-full animate-ping" />
            </span>
          )}
          <span className="text-xs">{isMuted || volume === 0 ? "🔇" : "🔊"}</span>
        </button>

        {/* Mobile Volume Popover */}
        {showVolumePopup && (
          <div className="absolute top-14 right-0 z-50 bg-gray-900 border border-gray-700 shadow-2xl rounded-2xl p-3.5 w-60 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-gray-800">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🪕</span>
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  Pagode da Resenha
                </span>
              </div>
              <button
                type="button"
                onClick={togglePlay}
                className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${
                  isPlaying
                    ? "bg-amber-400 text-gray-950"
                    : "bg-gray-800 text-white hover:bg-gray-700"
                }`}
              >
                <span>{isPlaying ? "⏸ Pausar" : "▶ Tocar"}</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
                <span className="flex items-center gap-1">
                  <span>{isMuted || volume === 0 ? "🔇 Mudo" : "🔊 Volume"}</span>
                </span>
                <span className="text-amber-400 tabular-nums">{currentVolPct}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="text-gray-400 hover:text-white text-xs p-1"
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
          </div>
        )}
      </div>
    </div>
  );
}
