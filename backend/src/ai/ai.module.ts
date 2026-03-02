import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { FakeAiService } from './fake-ai.service';
import { DetectionAdapterService } from './detection-adapter.service';
import { ScoringEngineService } from './scoring-engine.service';
import { AiAnalysisService } from './ai-analysis.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { SkinMetric } from '../skinMetric/skin-metric.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SkinAnalysis, SkinMetric]),
  ],
  controllers: [AiController],
  providers: [
    FakeAiService,
    DetectionAdapterService,
    ScoringEngineService,
    AiAnalysisService,
  ],
  exports: [
    FakeAiService,
    DetectionAdapterService,
    ScoringEngineService,
    AiAnalysisService,
  ],
})
export class AiModule { }
dashboard avec zustand  : 
la page /dadhboard présente les indicateurs essentiels des projets
créer un store zustand "dashboardStore" contenant : 
projects: tableau des projets
fetchProjects() : fonction qui récupère et stocke la liste des projets dans le store
 remarque : 
 cette section est indépendante des autres : on ne doit pas modifier les autrespages pour intégrer zustand
 ce store est utilisé uniquement dans /dashboard

 dans cette partie : 
 new Date() : créer un nouvel obj et récupérer la date et lheure actuelle
 ( au moment de l'execution)
  new Date().getMonth() : renvoie le mois et la date sous forme d'un entier entre 0 et 11
  new Date().getFullYear() : renvoie l'annee complete ( 4 chiffre) de la date 

  dans la page dashboard implémenter les contionnalités suivantes : 
  afficher le nombre de projets par statut
  afficher une alerte, si un projet esr en statut "en retard" et que sa deadline esr depasse
  (date<today)
  calculer et afficher les statistqiue mensuelle ssuivantes ; 
  nombre de projets crer en ce moisci
  nombre de projets en retard avec dealine passée ce mois-ci