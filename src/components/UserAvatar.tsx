interface UserAvatarProps {
  displayName: string | null;
  size?: string;
}

function getInitial(name: string | null): string {
  if (!name || name.trim().length === 0) return 'A';
  return name.trim().charAt(0).toUpperCase();
}

export default function UserAvatar({ displayName, size = 'size-10' }: UserAvatarProps) {
  return (
    <div
      aria-hidden="true"
      className={`${size} rounded-full bg-linear-to-br from-red-500 to-orange-500 text-neutral-950 font-display font-bold flex items-center justify-center shrink-0 text-sm`}
    >
      {getInitial(displayName)}
    </div>
  );
}
