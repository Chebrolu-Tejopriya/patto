import { HugeiconsIcon } from '@hugeicons/react';
import Activity01Icon from '@hugeicons/core-free-icons/Activity01Icon';
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';
import ArrowRight02Icon from '@hugeicons/core-free-icons/ArrowRight02Icon';
import ArtboardIcon from '@hugeicons/core-free-icons/ArtboardIcon';
import BlendIcon from '@hugeicons/core-free-icons/BlendIcon';
import Bookmark02Icon from '@hugeicons/core-free-icons/Bookmark02Icon';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon';
import FloppyDiskIcon from '@hugeicons/core-free-icons/FloppyDiskIcon';
import GridViewIcon from '@hugeicons/core-free-icons/GridViewIcon';
import MoonIcon from '@hugeicons/core-free-icons/MoonIcon';
import PauseIcon from '@hugeicons/core-free-icons/PauseIcon';
import PlayIcon from '@hugeicons/core-free-icons/PlayIcon';
import RefreshIcon from '@hugeicons/core-free-icons/RefreshIcon';
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon';
import ShuffleIcon from '@hugeicons/core-free-icons/ShuffleIcon';
import SlidersHorizontalIcon from '@hugeicons/core-free-icons/SlidersHorizontalIcon';
import Sun01Icon from '@hugeicons/core-free-icons/Sun01Icon';
import Upload01Icon from '@hugeicons/core-free-icons/Upload01Icon';

const icons = {
  search: Search01Icon,
  upload: Upload01Icon,
  sun: Sun01Icon,
  moon: MoonIcon,
  play: PlayIcon,
  pause: PauseIcon,
  save: FloppyDiskIcon,
  arrow: ArrowRight02Icon,
  grid: GridViewIcon,
  reset: RefreshIcon,
  copy: Copy01Icon,
  gradient: BlendIcon,
  bookmark: Bookmark02Icon,
  shuffle: ShuffleIcon,
  sliders: SlidersHorizontalIcon,
  motion: Activity01Icon,
  canvas: ArtboardIcon,
  chevron: ArrowDown01Icon,
  close: Cancel01Icon,
} as const;

export function Icon({ name }: { name: keyof typeof icons }) {
  return <HugeiconsIcon icon={icons[name]} size={16} strokeWidth={1.7} color="currentColor" aria-hidden="true" focusable="false" />;
}
