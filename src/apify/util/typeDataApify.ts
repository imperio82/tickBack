export class TikTokVideoData {
  
  id: string;
  text: string;
  textLanguage: string;
  createTime: number;
  createTimeISO: string;
  isAd: boolean;
  authorMeta: AuthorMeta;
  musicMeta: MusicMeta;
  webVideoUrl: string;
  mediaUrls: string[];
  videoMeta: VideoMeta;
  diggCount: number;
  shareCount: number;
  playCount: number;
  collectCount: number;
  commentCount: number;
  mentions: string[];
  detailedMentions: string[];
  hashtags: Hashtag[];
  effectStickers: EffectSticker[];
  isSlideshow: boolean;
  isPinned: boolean;
  isSponsored: boolean;
  input: string;
  fromProfileSection: string;
}

interface AuthorMeta {
  id: string;
  name: string;
  profileUrl: string;
  nickName: string;
  verified: boolean;
  signature: string;
  bioLink: string | null;
  originalAvatarUrl: string;
  avatar: string;
  commerceUserInfo: CommerceUserInfo;
  privateAccount: boolean;
  roomId: string;
  ttSeller: boolean;
  following: number;
  friends: number;
  fans: number;
  heart: number;
  video: number;
  digg: number;
}

interface CommerceUserInfo {
  commerceUser: boolean;
}

interface MusicMeta {
  musicName: string;
  musicAuthor: string;
  musicOriginal: boolean;
  musicAlbum: string;
  playUrl: string;
  coverMediumUrl: string;
  originalCoverMediumUrl: string;
  musicId: string;
}

interface VideoMeta {
  height: number;
  width: number;
  duration: number;
  coverUrl: string;
  originalCoverUrl: string;
  definition: string;
  format: string;
}

interface Hashtag {
  name: string;
}

interface EffectSticker {
  ID: string;
  name: string;
  stickerStats: StickerStats;
}

interface StickerStats {
  useCount: number;
}