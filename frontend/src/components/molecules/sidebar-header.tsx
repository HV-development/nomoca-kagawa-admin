import Logo from '@/components/atoms/Logo';
import Icon from '@/components/atoms/Icon';

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
  onLogoLoad?: () => void;
  onLogoError?: () => void;
}

export default function SidebarHeader({ isCollapsed, onToggleCollapse, onLogoLoad, onLogoError }: SidebarHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      {isCollapsed ? (
        onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <Icon name="chevronRight" size="sm" />
          </button>
        )
      ) : (
        <>
          <Logo size="sm" onLoad={onLogoLoad} onError={onLogoError} />
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <Icon name="chevronLeft" size="sm" />
            </button>
          )}
        </>
      )}
    </div>
  );
}