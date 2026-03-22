import { TwoFactorSetup } from '../components/TwoFactorSetup';

export function TwoFactorSetupPage() {
  return (
    <TwoFactorSetup
      onSuccess={() => {
        // Redirection et notification de succès seront gérées par le composant lui-même
      }}
    />
  );
}
