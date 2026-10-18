import React, { useState, useEffect } from 'react';
import TeenPattiGame from './TeenPattiGame';
import Card29Game from './Card29Game';
import LudoGame from './LudoGame';
import ChessGame from './ChessGame';
import { INITIAL_CHESS_FLAT } from './chessLogic';
import {
  createGameRoom,
  subscribeGameRoom,
  updateGameRoom,
  subscribeActiveGameRooms,
} from '../../services/tourStore';
import UserAvatar from '../UserAvatar';
import {
  Coins,
  Crown,
  Gamepad2,
  LogIn,
  Plus,
  Radio,
  Sparkles,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react';

const toBnNum = (n) => String(n ?? 0).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

const GAME_TYPES = [
  {
    id: 'teen_patti',
    name: '৩ পাত্তি (Teen Patti)',
    desc: '২ থেকে ৬ জন খেলোয়াড় • ৩ কার্ড • ব্লাইন্ড, চাল ও শো • ভার্চুয়াল চিপস',
    icon: '🃏',
    badge: 'সবচেয়ে জনপ্রিয়',
    badgeColor: 'bg-amber-400 text-teal-950',
    maxPlayers: 6,
    minPlayers: 2,
    gradient: 'from-amber-600 to-teal-800',
  },
  {
    id: 'card_29',
    name: '২৯ কার্ড গেম (29 Cards)',
    desc: '৪ জন খেলোয়াড় (২ বনাম ২ পার্টনারশিপ) • বিডিং ও তুরুপ • ট্রিক টেকিং',
    icon: '♠️',
    badge: 'কৌশলগত খেলা',
    badgeColor: 'bg-indigo-400 text-indigo-950',
    maxPlayers: 4,
    minPlayers: 4,
    gradient: 'from-indigo-700 to-purple-900',
  },
  {
    id: 'ludo',
    name: 'লুডো ক্লাব (Ludo Classic)',
    desc: '২ থেকে ৪ জন খেলোয়াড় • ১৫x১৫ বোর্ড • ছক্কা ও কাটাকাটি • হোম স্ট্রাইক',
    icon: '🎲',
    badge: 'পারিবারিক আনন্দ',
    badgeColor: 'bg-emerald-400 text-emerald-950',
    maxPlayers: 4,
    minPlayers: 2,
    gradient: 'from-emerald-600 to-teal-900',
  },
  {
    id: 'chess',
    name: 'দাবা (Chess Masters)',
    desc: '২ জন খেলোয়াড় (সাদা বনাম কালো) • রাজা, রানি ও ঘোড়া • চেকমেট যুদ্ধ',
    icon: '♟️',
    badge: 'বুদ্ধির লড়াই',
    badgeColor: 'bg-amber-500 text-slate-950',
    maxPlayers: 2,
    minPlayers: 2,
    gradient: 'from-slate-700 to-slate-950',
  },
];

export default function GameZoneHub({
  currentUser = null,
  currentProfile = {},
  members = [],
}) {
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [activeRoomData, setActiveRoomData] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState('teen_patti');
  const [roomTitle, setRoomTitle] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');

  const myEmail = (currentUser?.email || '').toLowerCase();
  const myName = currentProfile?.displayName || currentUser?.displayName || 'খেলোয়াড়';

  // Subscribe to active rooms list
  useEffect(() => {
    const unsub = subscribeActiveGameRooms((rooms) => {
      setAvailableRooms(rooms || []);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Subscribe to the active room when selected
  useEffect(() => {
    if (!activeRoomId) {
      setActiveRoomData(null);
      return;
    }
    const unsub = subscribeGameRoom(activeRoomId, (data) => {
      if (!data) {
        setActiveRoomId(null);
        setActiveRoomData(null);
        return;
      }
      setActiveRoomData(data);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [activeRoomId]);

  // Create Room Handler
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    const config = GAME_TYPES.find((g) => g.id === selectedGameType) || GAME_TYPES[0];
    const prefix =
      selectedGameType === 'teen_patti'
        ? 'TP'
        : selectedGameType === 'card_29'
          ? '29'
          : selectedGameType === 'ludo'
            ? 'LD'
            : 'CH';
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const newRoomId = `${prefix}-${randomCode}`;

    let initialPlayer = {
      email: myEmail,
      name: myName,
      photoURL: currentUser?.photoURL || currentProfile?.customPhotoURL || null,
      chips: 1000,
      ready: true,
      cards: [],
      seen: false,
      folded: false,
    };

    let initialState = {
      pot: 0,
      dealerIndex: 0,
      turnIndex: 0,
      lastAction: 'রুম তৈরি হয়েছে। অন্য খেলোয়াড়দের যোগদানের জন্য অপেক্ষা করুন।',
    };

    if (selectedGameType === 'ludo') {
      initialPlayer = {
        ...initialPlayer,
        color: 'red',
        colorIndex: 0,
      };
      initialState = {
        tokens: {
          red: [-1, -1, -1, -1],
          green: [-1, -1, -1, -1],
          yellow: [-1, -1, -1, -1],
          blue: [-1, -1, -1, -1],
        },
        turnIndex: 0,
        diceValue: null,
        hasRolled: false,
        status: 'waiting',
        lastAction: 'লুডো টেবিল তৈরি হয়েছে। অন্য খেলোয়াড়দের জন্য অপেক্ষা করুন।',
      };
    } else if (selectedGameType === 'chess') {
      initialPlayer = {
        ...initialPlayer,
        color: 'w',
      };
      initialState = {
        board: INITIAL_CHESS_FLAT,
        turn: 'w',
        status: 'waiting',
        winner: null,
        lastMove: null,
        history: [],
        captured: { w: [], b: [] },
        lastAction: 'দাবা রুম তৈরি হয়েছে। প্রতিপক্ষের জন্য অপেক্ষা করুন।',
      };
    }

    const newRoom = {
      id: newRoomId,
      gameType: selectedGameType,
      title: roomTitle.trim() || `${myName}-এর ${config.name} টেবিল`,
      hostEmail: myEmail,
      hostName: myName,
      status: 'waiting',
      maxPlayers: config.maxPlayers,
      players: [initialPlayer],
      state: initialState,
    };

    await createGameRoom(newRoom);
    setShowCreateModal(false);
    setRoomTitle('');
    setActiveRoomId(newRoomId);
  };

  // Join Room Handler
  const handleJoinRoom = async (targetRoomId) => {
    const cleanId = (targetRoomId || roomCodeInput).trim().toUpperCase();
    if (!cleanId) return;

    // Check if player is already in room or room is full
    setActiveRoomId(cleanId);
  };

  // Ensure current user is in room's players list upon entering
  useEffect(() => {
    if (!activeRoomData || !activeRoomId || !myEmail) return;

    const alreadyJoined = (activeRoomData.players || []).some(
      (p) => (p.email || '').toLowerCase() === myEmail
    );

    if (!alreadyJoined && activeRoomData.status === 'waiting') {
      const max = activeRoomData.maxPlayers || 6;
      if ((activeRoomData.players || []).length < max) {
        let newPlayer = {
          email: myEmail,
          name: myName,
          photoURL: currentUser?.photoURL || currentProfile?.customPhotoURL || null,
          chips: 1000,
          ready: true,
          cards: [],
          seen: false,
          folded: false,
        };

        if (activeRoomData.gameType === 'ludo') {
          const ludoColors = ['red', 'green', 'yellow', 'blue'];
          const colorIndex = (activeRoomData.players || []).length;
          newPlayer = {
            ...newPlayer,
            color: ludoColors[colorIndex] || 'red',
            colorIndex,
          };
        } else if (activeRoomData.gameType === 'chess') {
          const color = (activeRoomData.players || []).length === 0 ? 'w' : 'b';
          newPlayer = {
            ...newPlayer,
            color,
          };
        }

        const updatedPlayers = [...(activeRoomData.players || []), newPlayer];
        updateGameRoom(activeRoomId, {
          players: updatedPlayers,
        });
      }
    }
  }, [activeRoomData?.id]);

  // Leave Room Handler
  const handleLeaveRoom = () => {
    if (activeRoomData && activeRoomId) {
      const remainingPlayers = (activeRoomData.players || []).filter(
        (p) => (p.email || '').toLowerCase() !== myEmail
      );
      if (remainingPlayers.length === 0) {
        updateGameRoom(activeRoomId, {
          status: 'closed',
          players: [],
        });
      } else {
        const newHost =
          activeRoomData.hostEmail?.toLowerCase() === myEmail
            ? remainingPlayers[0]
            : null;

        updateGameRoom(activeRoomId, {
          players: remainingPlayers,
          ...(newHost
            ? { hostEmail: newHost.email, hostName: newHost.name }
            : {}),
        });
      }
    }
    setActiveRoomId(null);
    setActiveRoomData(null);
  };

  // If inside an active game room, render the game view
  if (activeRoomId && activeRoomData) {
    if (activeRoomData.gameType === 'teen_patti') {
      return (
        <TeenPattiGame
          room={activeRoomData}
          currentUser={currentUser}
          currentProfile={currentProfile}
          onLeave={handleLeaveRoom}
        />
      );
    }
    if (activeRoomData.gameType === 'card_29') {
      return (
        <Card29Game
          room={activeRoomData}
          currentUser={currentUser}
          currentProfile={currentProfile}
          onLeave={handleLeaveRoom}
        />
      );
    }
    if (activeRoomData.gameType === 'ludo') {
      return (
        <LudoGame
          room={activeRoomData}
          currentUser={currentUser}
          currentProfile={currentProfile}
          onLeave={handleLeaveRoom}
        />
      );
    }
    if (activeRoomData.gameType === 'chess') {
      return (
        <ChessGame
          room={activeRoomData}
          currentUser={currentUser}
          currentProfile={currentProfile}
          onLeave={handleLeaveRoom}
        />
      );
    }
  }

  return (
    <div className="flex-1 flex flex-col space-y-3 sm:space-y-4">
      {/* 1. Slim Game Zone Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-indigo-950 to-slate-900 text-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-md border border-teal-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-teal-950 flex items-center justify-center text-2xl shadow-lg shrink-0">
            🎮
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-400 text-teal-950 rounded-full shrink-0">
                ট্যুর গেমিং জোন
              </span>
              <h2 className="font-extrabold text-sm sm:text-base text-white">
                ফ্যামিলি অনলাইন কার্ড ক্লাব
              </h2>
            </div>
            <p className="text-xs text-teal-200/90 mt-0.5">
              বাসের সিটে বসে বা হোটেলে আড্ডার ফাঁকে পরিবারের সবার সাথে লাইভ ৩ পাত্তি ও ২৯ কার্ড খেলুন!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-teal-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            নতুন টেবিল তৈরি করুন
          </button>
        </div>
      </div>

      {/* 2. Direct Code Join Box */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2">
        <input
          type="text"
          placeholder="টেবিল কোড লিখুন (যেমন: TP-1234 বা 29-5678)..."
          value={roomCodeInput}
          onChange={(e) => setRoomCodeInput(e.target.value)}
          className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 uppercase font-mono tracking-wider"
        />
        <button
          type="button"
          onClick={() => handleJoinRoom(roomCodeInput)}
          disabled={!roomCodeInput.trim()}
          className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl shadow-2xs transition flex items-center gap-1 cursor-pointer"
        >
          <LogIn size={14} />
          যোগ দিন
        </button>
      </div>

      {/* 3. Featured Card Games Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5">
        {GAME_TYPES.map((game) => (
          <div
            key={game.id}
            className={`p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between hover:shadow-md transition`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{game.icon}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${game.badgeColor}`}>
                  {game.badge}
                </span>
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                {game.name}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {game.desc}
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">
                সর্বোচ্চ {toBnNum(game.maxPlayers)} জন
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedGameType(game.id);
                  setShowCreateModal(true);
                }}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-teal-950 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
              >
                <Plus size={13} />
                টেবিল খুলুন
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Active Live Tables List */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-red-500 animate-pulse" />
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
              সক্রিয় অনলাইন টেবিলসমূহ ({toBnNum(availableRooms.length)})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">রিয়েল-টাইম সিঙ্ক</span>
        </div>

        {availableRooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {availableRooms.map((r) => {
              const isFull = (r.playerCount || 0) >= (r.maxPlayers || 6);
              const isPlaying = r.status === 'playing';

              return (
                <div
                  key={r.id}
                  className="p-3 rounded-2xl border border-slate-200 hover:border-teal-500/80 bg-slate-50/70 hover:bg-white transition flex flex-col justify-between space-y-2 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black text-slate-800 truncate">
                        {r.title}
                      </span>
                      <span className="text-[9px] font-mono font-bold bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded shrink-0">
                        {r.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>হোস্ট: {r.hostName}</span>
                      <span>•</span>
                      <span className="capitalize">
                        {r.gameType === 'teen_patti'
                          ? '৩ পাত্তি'
                          : r.gameType === 'card_29'
                            ? '২৯ কার্ড'
                            : r.gameType === 'ludo'
                              ? 'লুডো'
                              : 'দাবা'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <Users size={12} className="text-teal-600" />
                      {toBnNum(r.playerCount || 0)} / {toBnNum(r.maxPlayers || 6)} জন
                    </span>

                    <button
                      type="button"
                      onClick={() => handleJoinRoom(r.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                        isPlaying
                          ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          : isFull
                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                            : 'bg-teal-700 hover:bg-teal-800 text-white'
                      }`}
                    >
                      {isPlaying ? 'খেলা দেখুন' : isFull ? 'রুম পূর্ণ' : 'বসে পড়ুন'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center space-y-1.5">
            <span className="text-3xl">🎴</span>
            <p className="text-xs font-bold text-slate-700">বর্তমানে কোনো ওপেন টেবিল নেই!</p>
            <p className="text-[11px] text-slate-400">
              আপনি প্রথম টেবিল তৈরি করে পরিবারের সবাইকে ইনভাইট করুন।
            </p>
          </div>
        )}
      </div>

      {/* 5. Create Table Modal */}
      {showCreateModal && (
        <div
          onClick={() => setShowCreateModal(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-4 sm:p-5 space-y-3.5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎲</span>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  নতুন গেম টেবিল তৈরি করুন
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  গেম নির্বাচন করুন:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {GAME_TYPES.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGameType(g.id)}
                      className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                        selectedGameType === g.id
                          ? 'bg-teal-50 border-teal-500 ring-1 ring-teal-400 font-bold text-teal-950'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-base mb-0.5">{g.icon}</div>
                      <div className="text-xs truncate">{g.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  টেবিলের নাম:
                </label>
                <input
                  type="text"
                  placeholder={`যেমন: ${myName}-এর আড্ডা...`}
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-teal-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer active:scale-95"
              >
                টেবিল চালু করুন
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
