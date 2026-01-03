
import React, { useEffect, useRef } from 'react';

interface Props {
  analyzer: AnalyserNode | null;
  isPlaying: boolean;
  color?: string;
}

const WaveformVisualizer: React.FC<Props> = ({ analyzer, isPlaying, color = "#a855f7" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!analyzer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyzer.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        
        ctx.fillStyle = color;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    if (isPlaying) {
      draw();
    }

    return () => cancelAnimationFrame(animationId);
  }, [analyzer, isPlaying, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={120} 
      className="w-full h-full opacity-80"
    />
  );
};

export default WaveformVisualizer;
