import { animeMaker } from '#anime';

export default animeMaker({
    command: ['seduce', 'seducir'],
    description: 'Intenta seducir a alguien o a sí mismo',
    soloPhrases: {
        global: ['intenta seducir', 'lanza una mirada', 'sonríe con picardía', 'se muestra atractivo']
    },
    togetherPhrases: {
        global: ['intenta seducir a', 'lanza una mirada a', 'sonríe con picardía a', 'coquetea con']
    }
});
