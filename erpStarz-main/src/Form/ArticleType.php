<?php

namespace App\Form;

use App\Entity\Article;
use App\Entity\TypeArticle;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Component\Validator\Constraints\GreaterThanOrEqual;

class ArticleType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('codeReferenceGroupe', TextType::class, [
                'label' => 'Code référence du groupe',
                'mapped' => false,
                'required' => true,
                'constraints' => [
                    new NotBlank([
                        'message' => 'Le code référence est obligatoire',
                    ]),
                ],
                'attr' => [
                    'class' => 'form-control',
                    'data-url' => $options['check_group_url'] ?? '',
                ],
            ])
            ->add('typeArticle', EntityType::class, [
                'class' => TypeArticle::class,
                'choice_label' => 'name',
                'label' => 'Type d\'article',
                'required' => $options['new_group_required'] ?? false,
                'mapped' => false,
                'attr' => [
                    'class' => 'form-control',
                ],
                'placeholder' => 'Sélectionnez un type',
            ])
            ->add('description', TextType::class, ['required' => false])
            ->add('stock', IntegerType::class, [
                'constraints' => [
                    new NotBlank(),
                    new GreaterThanOrEqual(['value' => 0])
                ]
            ])
            ->add('stockRebus', IntegerType::class, [
                'constraints' => [
                    new NotBlank(),
                    new GreaterThanOrEqual(['value' => 0])
                ]
            ])
            ->add('stockMin', IntegerType::class, ['required' => false])
            ->add('prix', NumberType::class, [
                'scale' => 2,
                'html5' => true,
                'attr' => [
                    'step' => '0.01'
                ]
            ])
            ->add('restrictCMD', NumberType::class, ['required' => false])
            ->add('supplier')
            ->add('currency')
            ->add('unit');
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Article::class,
            'check_group_url' => '',
            'new_group_required' => false,
        ]);
    }
}