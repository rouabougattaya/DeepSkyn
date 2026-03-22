<?php

namespace App\Controller;

use App\Entity\Article;
use App\Form\ArticleType;
use App\Service\ArticleService;
use App\Repository\GroupeArticleRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Form\FormError;

#[Route('/article')]
class ArticleController extends AbstractController
{
    public function __construct(private ArticleService $articleService) {}

    #[Route('/', name: 'app_article_index', methods: ['GET'])]
    public function index(): Response
    {
        return $this->render('article/index.html.twig', [
            'articles' => $this->articleService->getAllArticles(),
        ]);
    }

    #[Route('/new', name: 'app_article_new', methods: ['GET', 'POST'])]
    public function new(Request $request, GroupeArticleRepository $groupeArticleRepo): Response
    {
        $article = new Article();
        $form = $this->createForm(ArticleType::class, $article, [
            'check_group_url' => $this->generateUrl('app_article_check_groupe_exists'),
        ]);
        
        $form->handleRequest($request);

        if ($form->isSubmitted()) {
            $codeRef = $form->get('codeReferenceGroupe')->getData();
            $typeArticle = $form->get('typeArticle')->getData();
            $existingGroup = $groupeArticleRepo->findOneBy(['codeReference' => $codeRef]);

            if (!$existingGroup && !$typeArticle) {
                $form->get('typeArticle')->addError(new FormError('Un type d\'article est requis pour les nouveaux groupes'));
            }

            if ($form->isValid()) {
                try {
                    $this->articleService->createArticle(
                        $article, 
                        $codeRef,
                        $existingGroup,
                        $typeArticle
                    );
                    $this->addFlash('success', 'Article créé avec succès');
                    return $this->redirectToRoute('app_article_index');
                } catch (\Exception $e) {
                    $this->addFlash('error', 'Erreur : ' . $e->getMessage());
                }
            }
        }

        return $this->render('article/new.html.twig', [
            'form' => $form->createView(),
        ]);
    }

    #[Route('/check-groupe-exists', name: 'app_article_check_groupe_exists', priority: 10, methods: ['GET'])]
    public function checkGroupExists(Request $request, GroupeArticleRepository $groupeArticleRepo): JsonResponse
    {
        $code = $request->query->get('code');
        
        if (empty($code)) {
            return $this->json(['exists' => false], Response::HTTP_BAD_REQUEST);
        }

        $groupe = $groupeArticleRepo->findOneBy(['codeReference' => $code]);

        return $this->json([
            'exists' => $groupe !== null,
            'type' => $groupe ? $groupe->getTypeArticle()?->getId() : null
        ]);
    }

    #[Route('/show/{id}', name: 'app_article_show', methods: ['GET'])]
    public function show(int $id): Response
    {
        return $this->render('article/show.html.twig', [
            'article' => $this->articleService->getArticleById($id) ?? 
                         throw $this->createNotFoundException('Article introuvable')
        ]);
    }

    #[Route('/{id}/edit', name: 'app_article_edit', methods: ['GET', 'POST'])]
    public function edit(Request $request, int $id): Response
    {
        $article = $this->articleService->getArticleById($id) ?? 
                   throw $this->createNotFoundException('Article introuvable');

        $form = $this->createForm(ArticleType::class, $article);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $this->articleService->updateArticleFromEntity($article);
            $this->addFlash('success', 'Article mis à jour avec succès');
            return $this->redirectToRoute('app_article_index');
        }

        return $this->render('article/edit.html.twig', [
            'article' => $article,
            'form' => $form->createView(),
        ]);
    }

    #[Route('/{id}', name: 'app_article_delete', methods: ['POST'])]
    public function delete(Request $request, int $id): Response
    {
        $article = $this->articleService->getArticleById($id) ?? 
                   throw $this->createNotFoundException('Article introuvable');

        if ($this->isCsrfTokenValid('delete'.$article->getId(), $request->request->get('_token'))) {
            $this->articleService->deleteArticle($article);
            $this->addFlash('success', 'Article supprimé avec succès');
        }

        return $this->redirectToRoute('app_article_index');
    }
}