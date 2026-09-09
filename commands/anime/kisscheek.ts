import { animeMaker } from '#anime';

export default animeMaker({
    command: ['kisscheek', 'beso'],
    description: 'Da un beso en la mejilla a alguien o a ti mismo',
    soloPhrases: {
        global: ['besa su propia mejilla', 'se da un beso en la mejilla', 'besa el aire con ternura', 'sonríe y besa su mejilla']
    },
    togetherPhrases: {
        global: ['besa la mejilla de', 'deja un beso en la mejilla de', 'da un beso suave en la mejilla a', 'besa tiernamente la mejilla de']
    }
});
