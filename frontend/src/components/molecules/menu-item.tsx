import Icon from '@/components/atoms/Icon';

interface MenuItemProps {
  name: string;
  href: string;
  iconName: string;
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: (href: string) => void;
}

export default function MenuItem({ name, href, iconName, isActive, isCollapsed, onClick }: MenuItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick(href);
    } else {
      window.location.href = href;
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-green-100 text-green-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon name={iconName} size="md" className={isActive ? "text-green-700" : ""} />
      {!isCollapsed && <span>{name}</span>}
    </a>
  );
}
