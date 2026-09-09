import { animeMaker } from '#anime';

export default animeMaker({
    command: ['slap'],
    description: 'Da una bofetada a alguien o a ti mismo',
    soloPhrases: {
        hombre: ['se da una cachetada', 'se abofetea sin piedad', 'se golpea la mejilla', 'se da una bofetada'],
        mujer: ['se da una cachetada', 'se abofetea sin piedad', 'se golpea la mejilla', 'se da una bofetada'],
        otro: ['se da una cachetada', 'se abofetea sin piedad', 'se golpea la mejilla', 'se da una bofetada'],
        indefinido: ['se da una cachetada', 'se abofetea sin piedad', 'se golpea la mejilla', 'se da una bofetada']
    },
    togetherPhrases: {
        hombre: ['le da una bofetada a', 'abofetea con fuerza a', 'cachetea a', 'le da un golpe a'],
        mujer: ['le da una bofetada a', 'abofetea con fuerza a', 'cachetea a', 'le da un golpe a'],
        otro: ['le da una bofetada a', 'abofetea con fuerza a', 'cachetea a', 'le da un golpe a'],
        indefinido: ['le da una bofetada a', 'abofetea con fuerza a', 'cachetea a', 'le da un golpe a']
    }
});
