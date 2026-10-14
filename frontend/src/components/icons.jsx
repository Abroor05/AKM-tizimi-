// Central icon registry for the entire app
import {
  FaHouse, FaBuildingColumns, FaChartLine, FaFileLines, FaListCheck,
  FaBook, FaUsers, FaCalendarDay, FaBoxesStacked, FaFolderOpen,
  FaComments, FaBell, FaTrophy, FaChartBar, FaChartPie,
  FaMapLocationDot, FaUserGear, FaUserShield, FaShieldHalved,
  FaLock, FaGear,
  FaRightFromBracket, FaMagnifyingGlass, FaPen, FaTrashCan,
  FaEye, FaKey, FaFloppyDisk, FaPlus, FaXmark, FaCircleCheck,
  FaCircleExclamation, FaClock, FaCircleXmark, FaCircleInfo,
  FaChevronDown, FaChevronLeft, FaChevronRight, FaBars,
  FaUser, FaPhone, FaEnvelope, FaLocationDot, FaCalendar,
  FaFlag, FaArrowRight, FaArrowLeft, FaDownload, FaUpload,
  FaFilter, FaSort, FaEllipsis, FaCheck,
  FaBookOpen, FaBookBookmark, FaUserPlus,
  FaHandHolding, FaHandHoldingHeart, FaUsersLine, FaLightbulb,
  FaDisplay, FaStar, FaCircle, FaPenToSquare, FaPaperPlane,
  FaRotateRight, FaTableList, FaTriangleExclamation,
  FaCircleCheck as CheckIcon, FaCircleXmark as XIcon,
} from 'react-icons/fa6';

const ICON_MAP = {
  // Menu icons
  dashboard: FaHouse,
  library: FaBuildingColumns,
  activity: FaChartLine,
  reports: FaFileLines,
  tasks: FaListCheck,
  books: FaBook,
  readers: FaUsers,
  events: FaCalendarDay,
  inventory: FaBoxesStacked,
  documents: FaFolderOpen,
  appeals: FaComments,
  notifications: FaBell,
  kpi: FaTrophy,
  statistics: FaChartBar,
  analytics: FaChartPie,
  map: FaMapLocationDot,
  users: FaUserGear,
  roles: FaUserShield,
  audit: FaShieldHalved,
  security: FaLock,
  settings: FaGear,
  chart: FaChartBar,
  shield: FaShieldHalved,

  // Action icons
  logout: FaRightFromBracket,
  search: FaMagnifyingGlass,
  edit: FaPen,
  trash: FaTrashCan,
  eye: FaEye,
  key: FaKey,
  save: FaFloppyDisk,
  plus: FaPlus,
  close: FaXmark,
  success: FaCircleCheck,
  warning: FaCircleExclamation,
  error: FaCircleXmark,
  info: FaCircleInfo,
  pending: FaClock,
  chevronDown: FaChevronDown,
  chevronLeft: FaChevronLeft,
  chevronRight: FaChevronRight,
  bars: FaBars,
  user: FaUser,
  phone: FaPhone,
  email: FaEnvelope,
  location: FaLocationDot,
  calendar: FaCalendar,
  flag: FaFlag,
  arrowRight: FaArrowRight,
  arrowLeft: FaArrowLeft,
  download: FaDownload,
  upload: FaUpload,
  filter: FaFilter,
  sort: FaSort,
  ellipsis: FaEllipsis,
  check: FaCheck,
  times: FaXmark,
  exclamation: FaTriangleExclamation,
  bookOpen: FaBookOpen,
  bookBookmark: FaBookBookmark,
  userPlus: FaUserPlus,
  handHolding: FaHandHolding,
  handHoldingHeart: FaHandHoldingHeart,
  usersLine: FaUsersLine,
  lightbulb: FaLightbulb,
  display: FaDisplay,
  star: FaStar,
  circle: FaCircle,
  penToSquare: FaPenToSquare,
  paperPlane: FaPaperPlane,
  rotate: FaRotateRight,
  table: FaTableList,
  document: FaFileLines,
  file: FaFileLines,
};

// Fallback component if an icon name is requested but not found
const FallbackIcon = ({ className = '', ...props }) => (
  <span className={`inline-block ${className}`} {...props} />
);

// Proxy to guarantee an icon access never returns undefined and crashes React render
const SafeIcons = new Proxy(ICON_MAP, {
  get(target, prop) {
    if (prop in target) {
      return target[prop];
    }
    if (typeof prop === 'string' && prop !== 'prototype' && prop !== 'default') {
      console.warn(`[ICONS] Icon "${String(prop)}" is not found in ICON_MAP. Using fallback.`);
      return FallbackIcon;
    }
    return target[prop];
  },
});

export default SafeIcons;

