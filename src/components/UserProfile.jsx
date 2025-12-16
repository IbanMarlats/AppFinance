import { useAuth } from '../context/AuthContext';

export default function UserProfile() {
    const { user } = useAuth();

    if (!user) return null;

    const formatDate = (dateString) => {
        if (!dateString) return 'Inconnue';
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="card max-w-2xl mx-auto mt-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-600">
                    {user.email.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h1 className="text-2xl font-bold">{user.email}</h1>
                    <div className="flex gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide border ${user.role === 'admin'
                                ? 'bg-purple-100 text-purple-700 border-purple-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                            {user.role}
                        </span>
                        {user.is_premium && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-700 border border-amber-200">
                                Premium
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
                <div>
                    <p className="text-sm text-gray-500 mb-1">Statut du compte</p>
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${user.is_verified ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="font-medium">
                            {user.is_verified ? 'Vérifié' : 'Non vérifié'}
                        </span>
                    </div>
                </div>
                <div>
                    <p className="text-sm text-gray-500 mb-1">Membre depuis le</p>
                    <p className="font-medium text-gray-900">
                        {formatDate(user.created_at)}
                    </p>
                </div>
                <div>
                    <p className="text-sm text-gray-500 mb-1">Identifiant unique</p>
                    <p className="font-mono text-xs text-gray-400 select-all">
                        {user.id}
                    </p>
                </div>
            </div>
        </div>
    );
}
