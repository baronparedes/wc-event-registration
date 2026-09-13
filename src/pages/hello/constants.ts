import hello1Img from '@/assets/hello/ccf-hello-1.png';
import hello2Img from '@/assets/hello/ccf-hello-2.png';
import hello3Img from '@/assets/hello/ccf-hello-3.png';
import hello4Img from '@/assets/hello/ccf-hello-4.png';
import hello5Img from '@/assets/hello/ccf-hello-5.png';
import hello6Img from '@/assets/hello/ccf-hello-6.png';
import hello7Img from '@/assets/hello/ccf-hello-7.png';
import hello8Img from '@/assets/hello/ccf-hello-8.png';

export interface HelloCarouselSlide {
  id: number;
  src: string;
  title: string;
  alt: string;
}

export const HELLO_CAROUSEL_SLIDES: readonly HelloCarouselSlide[] = [
  {
    id: 1,
    src: hello1Img,
    title: 'Hello!',
    alt: 'Hello!',
  },
  {
    id: 2,
    src: hello2Img,
    title: 'Our Story',
    alt: 'Our Story',
  },
  {
    id: 3,
    src: hello3Img,
    title: 'Our Mission & Vision',
    alt: 'Our Mission & Vision',
  },
  {
    id: 4,
    src: hello4Img,
    title: 'Core Values',
    alt: 'Core Values',
  },
  {
    id: 5,
    src: hello5Img,
    title: 'The Good News',
    alt: 'The Good News',
  },
  {
    id: 6,
    src: hello6Img,
    title: 'Our Discipleship Journey',
    alt: 'Our Discipleship Journey',
  },
  {
    id: 7,
    src: hello7Img,
    title: 'Life Stage Ministries',
    alt: 'Life Stage Ministries',
  },
  {
    id: 8,
    src: hello8Img,
    title: "What's Next?",
    alt: "What's Next?",
  },
];
