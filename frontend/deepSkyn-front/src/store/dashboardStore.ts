import { create } from 'zustand';

export interface Project {
    id: string;
    name: string;
    status: 'en retard' | 'en cours' | 'complété';
    deadline: string;
    createdAt: string;
}

interface DashboardState {
    projects: Project[];
    loading: boolean;
    error: string | null;
    fetchProjects: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
    projects: [],
    loading: false,
    error: null,
    fetchProjects: async () => {
        set({ loading: true, error: null });
        try {
            // Simulation d'un appel API
            await new Promise((resolve) => setTimeout(resolve, 800));

            const mockProjects: Project[] = [
                {
                    id: '1',
                    name: 'Analyse de peau Été',
                    status: 'complété',
                    deadline: '2026-02-15',
                    createdAt: '2026-02-01',
                },
                {
                    id: '2',
                    name: 'Routine Hydratation',
                    status: 'en cours',
                    deadline: '2026-03-10',
                    createdAt: '2026-03-01',
                },
                {
                    id: '3',
                    name: 'Traitement Acné',
                    status: 'en retard',
                    deadline: '2026-03-01',
                    createdAt: '2026-02-20',
                },
                {
                    id: '4',
                    name: 'Soins Anti-âge',
                    status: 'en cours',
                    deadline: '2026-04-01',
                    createdAt: '2026-03-02',
                },
                {
                    id: '5',
                    name: 'Bilan Dermatologique',
                    status: 'en retard',
                    deadline: '2026-02-28',
                    createdAt: '2026-02-10',
                }
            ];

            set({ projects: mockProjects, loading: false });
        } catch (error) {
            set({ error: 'Erreur lors du chargement des projets', loading: false });
        }
    },
}));
