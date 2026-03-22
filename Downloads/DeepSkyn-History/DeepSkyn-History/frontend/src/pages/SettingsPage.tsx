import { SettingsPanel } from '../components/SettingsPanel';
import { Navbar } from '../components/Navbar';

export function SettingsPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white pt-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>
          <SettingsPanel />
        </div>
      </div>
    </>
  );
}
