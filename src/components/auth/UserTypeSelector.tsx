
import { useI18n } from '@/components/providers/I18nProvider';

type UserType = 'customer' | 'driver';

interface UserTypeSelectorProps {
  onSelect: (userType: UserType) => void;
  selectedType?: UserType | null;
  disabled?: boolean;
}

export const UserTypeSelector = ({
  onSelect,
  selectedType = null,
  disabled = false,
}: UserTypeSelectorProps) => {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center">{t('auth.userType.title')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onSelect('customer')}
          disabled={disabled}
          className={`p-6 border-2 rounded-lg transition-colors ${
            selectedType === 'customer'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="text-center">
            <div className="text-4xl mb-2">👤</div>
            <h3 className="text-lg font-semibold">{t('auth.login.customer')}</h3>
            <p className="text-sm text-gray-500">{t('auth.userType.customerDesc')}</p>
          </div>
        </button>
        
        <button
          type="button"
          onClick={() => onSelect('driver')}
          disabled={disabled}
          className={`p-6 border-2 rounded-lg transition-colors ${
            selectedType === 'driver'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="text-center">
            <div className="text-4xl mb-2">🚚</div>
            <h3 className="text-lg font-semibold">{t('auth.login.driver')}</h3>
            <p className="text-sm text-gray-500">{t('auth.userType.driverDesc')}</p>
          </div>
        </button>
      </div>
    </div>
  );
};
