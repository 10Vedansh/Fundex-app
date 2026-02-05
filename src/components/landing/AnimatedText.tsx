import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
  tag?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}

export function AnimatedText({ 
  text, 
  className = '', 
  delay = 0,
  staggerDelay = 0.03,
  tag: Tag = 'span'
}: AnimatedTextProps) {
  const containerRef = useRef<HTMLElement>(null);
  const words = text.split(' ');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const wordElements = el.querySelectorAll('.word');
    
    gsap.fromTo(
      wordElements,
      { 
        opacity: 0, 
        y: 40,
        rotateX: -45,
      },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 0.6,
        stagger: staggerDelay,
        delay: delay / 1000,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [delay, staggerDelay]);

  return (
    <Tag 
      ref={containerRef as any} 
      className={`${className} inline`}
      style={{ perspective: '1000px' }}
    >
      {words.map((word, i) => (
        <span 
          key={i} 
          className="word inline-block mr-[0.25em]"
          style={{ opacity: 0 }}
        >
          {word}
        </span>
      ))}
    </Tag>
  );
}
