import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Plane, Target, ChevronLeft, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, AlertCircle, Play, Pause, Navigation2, RefreshCw, Info, CheckCircle, Award, Map, BarChart2, Activity, Zap, BookOpen, X, CornerUpLeft, CornerUpRight, Clock, Wind, Triangle, Menu, Sliders, Sun, Moon, Cloud, Eye, LogOut } from 'lucide-react';
import { playSound } from '../services/audioService.ts';

// Re-use interface from SimulatorRoom if possible, but defining local for prop type
interface TrainingModule {
  id: string;
  name: string;
  type: string;
  subModules?: TrainingModule[];
}

interface VORSimulatorProps {
  type: 'VOR' | 'HSI';
  missionId?: string | null;
  onExit: () => void;
  menuItems?: TrainingModule[]; // For Free World Sidebar
}

interface Point3D { x: number, y: number, z: number }

type TimeOfDay = 'DAY' | 'DUSK' | 'NIGHT';

const VORSimulator: React.FC<VORSimulatorProps> = ({ type, missionId: initialMissionId, onExit, menuItems }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathRef = useRef<{ x: number, y: number }[]>([]);
  const aircraftImgRef = useRef<HTMLImageElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const ptTurnCompleteRef = useRef(false);
  
  const [missionId, setMissionId] = useState<string | null>(initialMissionId || null);

  const isHomingMission = missionId === 'f-homing';
  const isInboundInterceptMission = missionId === 'f-inbound';
  const isOutboundMission = missionId === 'f-outbound';
  const isTrackingMission = missionId === 'f-vor';
  const isLandingMission = missionId === 'l-crosswind';
  const isFreeFlight = !missionId;

  const stationPos = { x: 0, y: -5000 }; 

  // --- FLIGHT STATE ---
  const [altitude, setAltitude] = useState(isLandingMission ? 500 : 3500);
  const [verticalSpeed, setVerticalSpeed] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [roll, setRoll] = useState(0);
  
  // --- ENVIRONMENT SETTINGS ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [windSpeed, setWindSpeed] = useState(isLandingMission ? 15 : 0); 
  const [windDirection, setWindDirection] = useState(270); 
  const [visibility, setVisibility] = useState(10); // in NM
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('DAY');

  // --- LANDING SPECIFIC ---
  const [landingDist, setLandingDist] = useState(8000); 
  const [landingOffset, setLandingOffset] = useState(0); 
  const [landingYaw, setLandingYaw] = useState(0); 
  const [isCrashed, setIsCrashed] = useState(false);
  const [explosionParticles, setExplosionParticles] = useState<{x: number, y: number, r: number, c: string, v: {x:number, y:number}}[]>([]);

  const useWhiteTheme = (isFreeFlight || isOutboundMission || isTrackingMission || isInboundInterceptMission || (missionId && (missionId.startsWith('p-') || missionId.startsWith('c-') || missionId.startsWith('a-')))) && timeOfDay === 'DAY';

  const getInitialPosition = () => {
    if (isHomingMission) {
      const radius = 3500 + Math.random() * 2000;
      const angle = Math.random() * Math.PI * 2;
      return { x: stationPos.x + Math.cos(angle) * radius, y: stationPos.y + Math.sin(angle) * radius };
    }
    if (isInboundInterceptMission) return { x: stationPos.x + 50, y: stationPos.y };
    if (isOutboundMission) {
        const r170rad = (170 - 90) * (Math.PI / 180);
        return { x: stationPos.x + Math.cos(r170rad) * 50, y: stationPos.y + Math.sin(r170rad) * 50 };
    }
    if (isTrackingMission) return { x: 0, y: -4000 };
    return { x: 0, y: 0 }; 
  };

  const [isPaused, setIsPaused] = useState(!isFreeFlight);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false); // Default to closed for cleaner UI with new toolbar
  
  const [showPTSelection, setShowPTSelection] = useState(false);
  const [ptTimerDisplay, setPtTimerDisplay] = useState<number | null>(null);
  const [turnInboundAlert, setTurnInboundAlert] = useState(false);
  const [cdiMessage, setCdiMessage] = useState<string | null>(null);
  const [courseChangeAlert, setCourseChangeAlert] = useState(false);
  const [engineHealth, setEngineHealth] = useState(100);
  const [emergencyAlert, setEmergencyAlert] = useState(false);
  const [inboundEstablishedAlert, setInboundEstablishedAlert] = useState(false);
  const [planePos, setPlanePos] = useState(getInitialPosition()); 
  const [heading, setHeading] = useState(isHomingMission ? Math.floor(Math.random() * 360) : (isInboundInterceptMission ? 90 : (isOutboundMission ? 170 : (isTrackingMission ? 355 : 0))));
  const [obs, setObs] = useState(isHomingMission ? 0 : (isInboundInterceptMission ? 90 : (isOutboundMission ? 170 : (isTrackingMission ? 0 : 0))));
  const [radial, setRadial] = useState(0);
  const [isTo, setIsTo] = useState(true);
  const [isOff, setIsOff] = useState(false);
  const [cdiDeflection, setCdiDeflection] = useState(0);
  const [velocity, setVelocity] = useState((useWhiteTheme) ? 0.35 : 0.5); 
  const [headingBug, setHeadingBug] = useState(heading);
  const [phase, setPhase] = useState<'INTERCEPT' | 'INBOUND' | 'OUTBOUND' | 'HOMING' | 'PROC_TURN' | 'INBOUND_TRACK' | 'FINAL_APPROACH' | 'COURSE_CHANGE' | 'TRACKING'>(
      isInboundInterceptMission ? 'OUTBOUND' : isHomingMission ? 'HOMING' : isLandingMission ? 'FINAL_APPROACH' : isOutboundMission ? 'OUTBOUND' : isTrackingMission ? 'INBOUND' : 'INBOUND'
  );
  const [showPassageExplanation, setShowPassageExplanation] = useState(false);

  const AIRCRAFT_IMG_URL = "https://lh3.googleusercontent.com/d/1ahthu2ZsyfNcYGsQPI9K9GiIxqM8JUI1";
  const currentDme = (Math.hypot(planePos.x - stationPos.x, planePos.y - stationPos.y) / 100).toFixed(1);

  const envFeatures = useMemo(() => {
    const features: { x: number, y: number, type: 'tree' | 'dirt' | 'road' | 'bush', size: number, rotation?: number }[] = [];
    if (!isHomingMission) return [];
    let seed = 42;
    const random = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 400; i++) features.push({ x: (random() - 0.5) * 20000, y: (random() - 0.5) * 20000 - 5000, type: random() > 0.3 ? 'tree' : 'bush', size: 15 + random() * 20 });
    for (let i = 0; i < 100; i++) features.push({ x: (random() - 0.5) * 15000, y: (random() - 0.5) * 15000 - 5000, type: 'dirt', size: 100 + random() * 300, rotation: random() * Math.PI });
    return features;
  }, [isHomingMission]);

  useEffect(() => {
    const img = new Image();
    img.src = AIRCRAFT_IMG_URL;
    img.onload = () => { aircraftImgRef.current = img; };
  }, []);

  const handleMissionSelect = (newMissionId: string) => {
    setMissionId(newMissionId);
    playSound('click');
    setIsPaused(true);
    setIsCompleted(false);
    pathRef.current = [];
    if (newMissionId.startsWith('p-hold') || newMissionId.startsWith('c-') || newMissionId.startsWith('a-')) {
        setPlanePos({ x: 0, y: -3000 }); setHeading(0); setObs(0); setPhase('INBOUND');
    }
    else if (newMissionId === 'f-vor') { setPlanePos({ x: 0, y: -4000 }); setHeading(355); setObs(0); setPhase('INBOUND'); }
    else if (newMissionId === 'f-homing') { setPlanePos({ x: 2000, y: 2000 }); setHeading(Math.floor(Math.random() * 360)); setObs(0); setPhase('HOMING'); }
    else if (newMissionId === 'f-inbound') { setPlanePos({ x: stationPos.x + 50, y: stationPos.y }); setHeading(90); setObs(90); setPhase('OUTBOUND'); }
    else if (newMissionId === 'f-outbound') {
        const r170rad = (170 - 90) * (Math.PI / 180);
        setPlanePos({ x: stationPos.x + Math.cos(r170rad) * 50, y: stationPos.y + Math.sin(r170rad) * 50 });
        setHeading(170); setObs(170); setPhase('OUTBOUND');
    }
    setTimeout(() => setIsPaused(false), 500);
  };

  const renderLandingScene = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      const gradientSky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      
      // Sky color based on time of day
      if (timeOfDay === 'DAY') {
          gradientSky.addColorStop(0, '#0f172a'); gradientSky.addColorStop(1, '#60a5fa');
      } else if (timeOfDay === 'DUSK') {
          gradientSky.addColorStop(0, '#1e1b4b'); gradientSky.addColorStop(1, '#f97316');
      } else {
          gradientSky.addColorStop(0, '#020617'); gradientSky.addColorStop(1, '#1e293b');
      }

      ctx.fillStyle = gradientSky; ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width; const height = canvas.height; const fov = 600;
      const horizonY = height / 2 + (pitch * 15);
      
      // Ground color based on time
      ctx.fillStyle = timeOfDay === 'NIGHT' ? '#0a0a0a' : '#1e293b'; 
      ctx.fillRect(0, horizonY, width, height - horizonY);

      const camX = landingOffset; const camY = altitude + 80; const camZ = landingDist + 250; 
      const project = (x: number, y: number, z: number) => {
          let rx = x - camX; let ry = y - camY; let rz = z - camZ; 
          const yawRad = -landingYaw * Math.PI / 180; 
          const rx2 = rx * Math.cos(yawRad) - rz * Math.sin(yawRad); const rz2 = rx * Math.sin(yawRad) + rz * Math.cos(yawRad);
          rx = rx2; rz = rz2;
          const pitchRad = -pitch * Math.PI / 180;
          const ry2 = ry * Math.cos(pitchRad) - rz * Math.sin(pitchRad); const rz3 = ry * Math.sin(pitchRad) + rz * Math.cos(pitchRad);
          ry = ry2; rz = rz3;
          if (rz >= 0) return null;
          const scale = fov / Math.abs(rz);
          return { x: width / 2 + rx * scale, y: height / 2 - ry * scale, scale: scale };
      };

      const rWidth = 100; const rLength = 15000;
      const p1 = project(-rWidth, 0, 0); const p2 = project(rWidth, 0, 0); const p3 = project(rWidth, 0, -rLength); const p4 = project(-rWidth, 0, -rLength);
      
      if (p1 && p2 && p3 && p4) {
          ctx.fillStyle = '#333'; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.fill();
          
          // Runway Lights at Night
          if (timeOfDay !== 'DAY') {
              ctx.fillStyle = '#fff';
              for (let zl = 0; zl < rLength; zl += 400) {
                const lpL = project(-rWidth - 5, 2, -zl); if (lpL) ctx.fillRect(lpL.x, lpL.y, 2, 2);
                const lpR = project(rWidth + 5, 2, -zl); if (lpR) ctx.fillRect(lpR.x, lpR.y, 2, 2);
              }
          }

          ctx.strokeStyle = '#fff'; ctx.setLineDash([30, 30]); ctx.lineWidth = 2; ctx.beginPath();
          const start = project(0, 0, 0); const end = project(0, 0, -rLength);
          if (start && end) { ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke(); }
          ctx.setLineDash([]);
          ctx.fillStyle = 'white'; ctx.font = 'bold 20px monospace';
          const numPos = project(-10, 0, -100); if (numPos) ctx.fillText("36", numPos.x, numPos.y);
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
      const gridSize = 500; const gridOffsetZ = Math.floor(landingDist / gridSize) * gridSize; const gridOffsetX = Math.floor(landingOffset / gridSize) * gridSize;
      for(let i = -5; i <= 20; i++) {
          const z = -gridOffsetZ + (i * gridSize); 
          if (z < camZ) {
             const g1 = project(gridOffsetX - 10000, 0, z); const g2 = project(gridOffsetX + 10000, 0, z);
             if (g1 && g2) { ctx.beginPath(); ctx.moveTo(g1.x, g1.y); ctx.lineTo(g2.x, g2.y); ctx.stroke(); }
          }
      }

      // VISIBILITY FOG
      const fogIntensity = 1 - (visibility / 10);
      if (fogIntensity > 0) {
          ctx.fillStyle = timeOfDay === 'DAY' ? `rgba(200, 200, 200, ${fogIntensity})` : `rgba(30, 30, 40, ${fogIntensity})`;
          ctx.fillRect(0, 0, width, height);
      }

      if (!isCrashed) {
          const shadowPos = project(landingOffset, 0, landingDist);
          if (shadowPos) {
              ctx.save(); ctx.translate(shadowPos.x, shadowPos.y); ctx.rotate((landingYaw) * Math.PI / 180);
              const shadowScale = shadowPos.scale * 3.0; ctx.scale(shadowScale, shadowScale * 0.5); 
              ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(60, 2); ctx.lineTo(0, 35); ctx.lineTo(-60, 2); ctx.fill(); ctx.restore();
          }
      }

      const planeScreenY = height / 2 + 80; 
      ctx.save(); ctx.translate(width / 2, planeScreenY); 
      if (isCrashed) {
          explosionParticles.forEach(p => { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });
          ctx.restore();
          ctx.fillStyle = 'red'; ctx.font = '900 40px monospace'; ctx.textAlign = 'center'; ctx.shadowColor = 'black'; ctx.shadowBlur = 10;
          ctx.fillText("CRITICAL FAILURE", width/2, height/2);
          ctx.font = 'bold 20px monospace'; ctx.fillStyle = 'white'; ctx.fillText("IMPACT WITH TERRAIN", width/2, height/2 + 40);
      } else {
          ctx.rotate(roll * Math.PI / 180); ctx.rotate(landingYaw * 0.1 * Math.PI / 180);
          const acScale = 3.0;
          const projectAC = (v: Point3D) => {
              const pr = pitch * Math.PI / 180;
              const y1 = v.y * Math.cos(pr) - v.z * Math.sin(pr); const z1 = v.y * Math.sin(pr) + v.z * Math.cos(pr);
              const scale = 400 / (400 + z1 + 50); return { x: v.x * scale * acScale, y: y1 * scale * acScale };
          };
          const vertices = [
              { x: 0, y: 0, z: 50 }, { x: 0, y: 12, z: 10 }, { x: 8, y: -5, z: 10 }, { x: -8, y: -5, z: 10 }, { x: 0, y: 0, z: -50 }, 
              { x: 70, y: 2, z: 5 }, { x: -70, y: 2, z: 5 }, { x: 0, y: 30, z: -45 }, { x: 25, y: 2, z: -45 }, { x: -25, y: 2, z: -45 }
          ];
          const ap4 = projectAC(vertices[4]); const ap7 = projectAC(vertices[7]); const ap8 = projectAC(vertices[8]); const ap9 = projectAC(vertices[9]);
          ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.moveTo(ap4.x, ap4.y); ctx.lineTo(ap8.x, ap8.y); ctx.lineTo(ap9.x, ap9.y); ctx.fill();
          ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(ap4.x, ap4.y); ctx.lineTo(ap4.x, ap4.y-5); ctx.lineTo(ap7.x, ap7.y); ctx.fill();
          const ap2 = projectAC(vertices[2]); const ap3 = projectAC(vertices[3]); const ap5 = projectAC(vertices[5]); const ap6 = projectAC(vertices[6]);
          ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(ap2.x, ap2.y); ctx.lineTo(ap5.x, ap5.y); ctx.lineTo(ap5.x, ap5.y+10); ctx.lineTo(ap3.x, ap3.y); ctx.fill();
          ctx.beginPath(); ctx.moveTo(ap3.x, ap3.y); ctx.lineTo(ap6.x, ap6.y); ctx.lineTo(ap6.x, ap6.y+10); ctx.lineTo(ap2.x, ap2.y); ctx.fill();
          const ap0 = projectAC(vertices[0]); const ap1 = projectAC(vertices[1]); 
          ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(ap0.x, ap0.y); ctx.lineTo(ap2.x, ap2.y); ctx.lineTo(ap4.x, ap4.y); ctx.lineTo(ap3.x, ap3.y); ctx.fill();
          ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.moveTo(ap0.x, ap0.y); ctx.lineTo(ap2.x, ap2.y); ctx.lineTo(ap1.x, ap1.y); ctx.lineTo(ap3.x, ap3.y); ctx.fill();
          ctx.save(); ctx.translate(ap0.x, ap0.y); ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
          ctx.beginPath(); ctx.ellipse(0, 0, 25 * acScale, 25 * acScale, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); ctx.restore();
      }

      if (!isCrashed && !isCompleted) {
          ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#0f0'; ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
          ctx.fillText(`ALT: ${altitude.toFixed(0)} FT`, 20, 30);
          ctx.fillText(`DST: ${(landingDist/6076).toFixed(1)} NM`, 20, 50);
          ctx.fillText(`OFFSET: ${Math.abs(landingOffset).toFixed(0)} FT ${landingOffset > 0 ? 'R' : 'L'}`, 20, 70);
          ctx.fillText(`VS: ${verticalSpeed.toFixed(0)} FPM`, 20, 90);
      }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId: number;
    const update = () => {
      if (!isPaused && !isCompleted && !isCrashed && !showPassageExplanation && !showPTSelection && !courseChangeAlert && !isSettingsOpen) {
          const dt = 0.016; 
          const airspeed = velocity * 250;
          const speedInFps = airspeed * 1.68781; 
          
          if (isLandingMission) {
              setLandingDist(prev => prev - speedInFps * dt);
              const targetVS = pitch * 150; 
              setVerticalSpeed(targetVS);
              const nextAlt = altitude + (targetVS / 60 * dt * 5);
              if (nextAlt <= 0) {
                  setAltitude(0);
                  const isHardLanding = Math.abs(targetVS) > 500;
                  const isOffRunway = Math.abs(landingOffset) > 100;
                  const isBanked = Math.abs(roll) > 15;
                  if (isHardLanding || isOffRunway || isBanked || landingDist > 100) {
                      setIsCrashed(true);
                      const parts = [];
                      for(let i=0; i<30; i++) parts.push({ x: 0, y: 0, r: 10 + Math.random() * 20, c: ['#ff0000', '#ffaa00', '#ffff00'][Math.floor(Math.random()*3)], v: {x: (Math.random()-0.5)*10, y: (Math.random()-0.5)*10} });
                      setExplosionParticles(parts);
                      playSound('click'); 
                  } else { setIsCompleted(true); playSound('click'); }
              } else setAltitude(nextAlt);
              
              // Wind drift logic updated for arbitrary wind direction
              const windRad = (windDirection - 90) * (Math.PI / 180);
              const runwayRad = (360 - 90) * (Math.PI / 180); // Runway 36 is heading North (0 deg)
              const crosswindComponent = windSpeed * Math.sin(windRad - runwayRad);
              
              const windDrift = crosswindComponent * 0.5 * dt; 
              const headingDrift = (landingYaw * Math.PI / 180) * speedInFps * dt;
              const bankDrift = -(roll * Math.PI / 180) * speedInFps * 0.5 * dt;
              setLandingOffset(prev => prev + windDrift + headingDrift + bankDrift);
          } else {
              setPlanePos(prev => {
                  const rad = (heading - 90) * (Math.PI / 180);
                  
                  // Calculate crosswind for 2D map
                  const windRad = (windDirection - 90) * (Math.PI / 180);
                  const driftX = Math.cos(windRad) * (windSpeed * 0.01);
                  const driftY = Math.sin(windRad) * (windSpeed * 0.01);

                  const powerLoss = isHomingMission && engineHealth < 100 ? (engineHealth / 100) : 1;
                  const currentVel = velocity * powerLoss;
                  const newX = prev.x + Math.cos(rad) * currentVel + driftX;
                  const newY = prev.y + Math.sin(rad) * currentVel + driftY;
                  
                  const lastPoint = pathRef.current[pathRef.current.length - 1];
                  if (!lastPoint || Math.hypot(lastPoint.x - newX, lastPoint.y - newY) > 5) pathRef.current.push({ x: newX, y: newY });
                  const dx = newX - stationPos.x; const dy = newY - stationPos.y;
                  const distToStation = Math.hypot(dx, dy) / 100;
                  let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                  while (angle < 0) angle += 360; while (angle >= 360) angle -= 360;
                  const currentRadial = Math.round(angle); setRadial(currentRadial);
                  let diff = obs - currentRadial; while (diff > 180) diff -= 360; while (diff < -180) diff += 360;
                  const isActuallyTo = Math.abs(diff) > 90; setIsOff(distToStation < 0.25);
                  let cdiError = diff; if (isActuallyTo) { let toDiff = diff + (diff > 0 ? -180 : 180); cdiError = -toDiff; }
                  const currentCdiDeflection = Math.max(-10, Math.min(10, cdiError)) / 10; setCdiDeflection(currentCdiDeflection);
                  
                  if (isOutboundMission) {
                      if (phase === 'OUTBOUND' && distToStation >= 6.0) { setObs(160); setHeadingBug(215); setCourseChangeAlert(true); playSound('click'); setPhase('INTERCEPT'); setIsPaused(true); return prev; }
                      if (phase === 'INTERCEPT' && obs === 160 && Math.abs(currentCdiDeflection) < 0.8) { setPhase('TRACKING'); setInboundEstablishedAlert(true); setTimeout(() => setInboundEstablishedAlert(false), 3000); }
                      if (phase === 'TRACKING' && distToStation >= 15.0 && Math.abs(currentCdiDeflection) < 0.2) setIsCompleted(true);
                  }
                  if (isTrackingMission) {
                      if (phase === 'INBOUND' && distToStation < 0.5) { setShowPassageExplanation(true); setPhase('OUTBOUND'); setIsPaused(true); playSound('click'); return prev; }
                      if (phase === 'OUTBOUND' && distToStation > 5.0) setIsCompleted(true);
                  }
                  if (isInboundInterceptMission) {
                      if (phase === 'OUTBOUND' && distToStation >= 5.0) { setIsPaused(true); setShowPTSelection(true); playSound('click'); return prev; }
                      if (phase === 'PROC_TURN') {
                           if (timerRef.current === null && !ptTurnCompleteRef.current) {
                                let headingDiff = Math.abs(heading - headingBug); if (headingDiff > 180) headingDiff = 360 - headingDiff;
                                if (headingDiff < 5) { timerRef.current = 45; setPtTimerDisplay(45); playSound('click'); }
                           } else if (timerRef.current !== null) {
                                timerRef.current -= 0.05;
                                if (timerRef.current <= 0) { timerRef.current = null; ptTurnCompleteRef.current = true; setPtTimerDisplay(null); setTurnInboundAlert(true); setHeadingBug(prevBug => (prevBug + 180) % 360); playSound('click'); }
                                else { const displayVal = Math.ceil(timerRef.current); if (displayVal !== ptTimerDisplay) setPtTimerDisplay(displayVal); }
                           }
                           if (Math.abs(newY - stationPos.y) < 300) { let hdgDiff = Math.abs(heading - 270); if (hdgDiff > 180) hdgDiff = 360 - hdgDiff; if (hdgDiff < 60) { setPhase('INBOUND_TRACK'); setInboundEstablishedAlert(true); setTurnInboundAlert(false); setCdiMessage(null); playSound('click'); setTimeout(() => setInboundEstablishedAlert(false), 4000); } }
                      }
                      if (phase === 'INBOUND_TRACK' && distToStation < 0.5) setIsCompleted(true);
                  }
                  if (isHomingMission && distToStation < 0.3) setIsCompleted(true);
                  setIsTo(isActuallyTo);
                  return { x: newX, y: newY };
              });
              
              setRoll(prev => prev + (Math.random() - 0.5) * 0.5);
              setPitch(prev => prev + (Math.random() - 0.5) * 0.1);
          }
      }
      if (isLandingMission) {
          if (isCrashed) setExplosionParticles(prev => prev.map(p => ({ ...p, x: p.x + p.v.x, y: p.y + p.v.y, r: p.r * 0.95 })).filter(p => p.r > 0.5));
          renderLandingScene(ctx, canvas);
      } else {
          const centerX = canvas.width / 2; const centerY = canvas.height / 2;
          
          // Background color for 2D map based on time of day
          if (timeOfDay === 'DAY') {
              ctx.fillStyle = useWhiteTheme ? '#ffffff' : (isHomingMission ? '#2d4c1e' : '#050505');
          } else if (timeOfDay === 'DUSK') {
              ctx.fillStyle = useWhiteTheme ? '#fed7aa' : (isHomingMission ? '#1e293b' : '#050505');
          } else {
              ctx.fillStyle = '#020617';
          }
          
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.save(); ctx.translate(centerX, centerY);
          
          if (isHomingMission) {
              envFeatures.forEach(feat => {
                  const drawX = feat.x - planePos.x; const drawY = feat.y - planePos.y;
                  if (Math.abs(drawX) < 1000 && Math.abs(drawY) < 1000) {
                      if (feat.type === 'tree') { ctx.fillStyle = '#1e3314'; ctx.beginPath(); ctx.arc(drawX, drawY, feat.size, 0, Math.PI * 2); ctx.fill(); }
                      else if (feat.type === 'bush') { ctx.fillStyle = '#3a5a2b'; ctx.beginPath(); ctx.arc(drawX, drawY, feat.size, 0, Math.PI * 2); ctx.fill(); }
                      else if (feat.type === 'dirt') { ctx.save(); ctx.translate(drawX, drawY); ctx.rotate(feat.rotation || 0); ctx.fillStyle = '#4a3c2a'; ctx.fillRect(-feat.size/2, -feat.size/4, feat.size, feat.size/2); ctx.restore(); }
                  }
              });
          }
          const drawStationX = stationPos.x - planePos.x; const drawStationY = stationPos.y - planePos.y;
          if (useWhiteTheme) {
            ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1; ctx.textAlign = 'center'; ctx.font = '10px monospace'; ctx.fillStyle = '#3b82f6';
            for (let r = 0; r < 360; r += 20) {
                const rad = (r - 90) * (Math.PI / 180); const maxLen = 30000; const textDist = 400;
                ctx.beginPath(); ctx.moveTo(drawStationX, drawStationY); ctx.lineTo(drawStationX + Math.cos(rad) * maxLen, drawStationY + Math.sin(rad) * maxLen); ctx.stroke();
                ctx.fillText(r.toString().padStart(3, '0'), drawStationX + Math.cos(rad) * textDist, drawStationY + Math.sin(rad) * textDist);
            }
          } else {
            ctx.strokeStyle = isHomingMission ? '#ffffff04' : '#ffffff06'; ctx.lineWidth = 1;
            const gridSize = 150; const startX = Math.floor((planePos.x - centerX) / gridSize) * gridSize; const startY = Math.floor((planePos.y - centerY) / gridSize) * gridSize;
            for (let x = startX - 2000; x < startX + 2000; x += gridSize) { ctx.beginPath(); ctx.moveTo(x - planePos.x, -15000); ctx.lineTo(x - planePos.x, 15000); ctx.stroke(); }
            for (let y = startY - 2000; y < startY + 2000; y += gridSize) { ctx.beginPath(); ctx.moveTo(-15000, y - planePos.y); ctx.lineTo(15000, y - planePos.y); ctx.stroke(); }
          }
          ctx.save(); ctx.strokeStyle = '#ef4444'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2.5; ctx.beginPath();
          pathRef.current.forEach((p, i) => { const drawX = p.x - planePos.x; const drawY = p.y - planePos.y; if (i === 0) ctx.moveTo(drawX, drawY); else ctx.lineTo(drawX, drawY); });
          ctx.stroke(); ctx.restore();
          
          if (!isHomingMission || Math.hypot(drawStationX, drawStationY) < 1500) {
              ctx.strokeStyle = useWhiteTheme ? '#000' : '#3b82f6'; ctx.fillStyle = useWhiteTheme ? '#3b82f6' : '#1d4ed8'; ctx.lineWidth = 2;
              ctx.beginPath(); for (let i = 0; i < 6; i++) { const angle = (i * 60 - 30) * Math.PI / 180; const r = 12; const x = drawStationX + Math.cos(angle) * r; const y = drawStationY + Math.sin(angle) * r; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
              ctx.closePath(); ctx.fill(); ctx.stroke();
              ctx.fillStyle = useWhiteTheme ? '#000' : '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText("VOR STATION", drawStationX, drawStationY + 25);
          }
          ctx.save(); ctx.rotate(heading * (Math.PI / 180));
          if (aircraftImgRef.current) { if (useWhiteTheme) ctx.filter = 'invert(1) brightness(0.5) contrast(1.2)'; ctx.drawImage(aircraftImgRef.current, -24, -24, 48, 48); ctx.filter = 'none'; }
          else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(15, 20); ctx.lineTo(0, 10); ctx.lineTo(-15, 20); ctx.fill(); }
          ctx.restore(); ctx.restore();

          // 2D VISIBILITY FOG OVERLAY
          const fogIntensity = 1 - (visibility / 10);
          if (fogIntensity > 0) {
              ctx.fillStyle = timeOfDay === 'DAY' ? `rgba(255, 255, 255, ${fogIntensity})` : `rgba(15, 23, 42, ${fogIntensity})`;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
      }
      animationFrameId = requestAnimationFrame(update);
    };
    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, planePos, heading, obs, isCompleted, phase, missionId, showPassageExplanation, showPTSelection, courseChangeAlert, useWhiteTheme, altitude, pitch, roll, visibility, timeOfDay, windSpeed, windDirection, isSettingsOpen]);

  const changeHeading = (amount: number) => {
    if (isLandingMission) {
        setRoll(prev => Math.max(-45, Math.min(45, prev + amount * 2)));
        setLandingYaw(prev => prev + amount * 0.5);
    } else {
        setRoll(prev => Math.max(-30, Math.min(30, prev + amount * 1.5)));
        setHeading(prev => (prev + amount + 360) % 360);
        setTimeout(() => setRoll(0), 1000); 
    }
    playSound('click');
  };

  const changePitch = (amount: number) => {
     setPitch(prev => Math.max(-15, Math.min(15, prev + amount * 0.5)));
     if (!isLandingMission) {
        setVelocity(prev => Math.max(0.1, Math.min(1.5, prev + amount * 0.05)));
        setAltitude(prev => Math.max(0, prev + amount * 20));
     }
     playSound('click');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || isCompleted || isCrashed || isSettingsOpen) return;
      switch (e.key) {
        case 'ArrowLeft': changeHeading(-2); break;
        case 'ArrowRight': changeHeading(2); break;
        case 'ArrowUp': changePitch(1); break;
        case 'ArrowDown': changePitch(-1); break;
        case '[': setObs(prev => (prev - 1 + 360) % 360); playSound('click'); break;
        case ']': setObs(prev => (prev + 1 + 360) % 360); playSound('click'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused, isCompleted, isCrashed, isSettingsOpen]);

  // --- EFIS RENDERER ---
  const renderEFIS = () => {
      const airspeed = Math.round(velocity * 250);
      const roundedAlt = Math.round(altitude);
      
      return (
          <div className="w-full h-full bg-[#050505] flex flex-col relative overflow-hidden border-t-2 border-zinc-700 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/40 pointer-events-none z-10"></div>
              
              <div className="flex-1 relative flex items-center justify-between px-2 py-4">
                  
                  <div className="w-20 h-full bg-[#111] border-r border-white/20 relative overflow-hidden shadow-inner flex flex-col items-end">
                      <div className="absolute top-0 w-full h-6 bg-zinc-900 border-b border-white/20 flex items-center justify-center text-[9px] text-zinc-500 font-bold uppercase tracking-widest">SPD</div>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-full h-full overflow-hidden">
                          {[-80, -60, -40, -20, 0, 20, 40, 60, 80].map(off => {
                              const val = Math.round(airspeed / 20) * 20 + off;
                              if (val < 0) return null;
                              return (
                                  <div key={off} className="absolute right-0 flex items-center transition-transform duration-300" style={{ transform: `translateY(${off * 2.5}px)` }}>
                                      <span className="text-[10px] font-bold text-white/50 mr-2">{val}</span>
                                      <div className="w-2 h-px bg-white/30"></div>
                                  </div>
                              );
                          })}
                      </div>
                      <div className="absolute top-1/2 -translate-y-1/2 right-1 w-16 h-8 bg-black border border-white flex items-center justify-center text-xl font-black text-g1000-green shadow-xl z-20">
                          {airspeed}
                      </div>
                  </div>

                  <div className="flex-1 h-full relative overflow-hidden bg-[#2d4d80]">
                      <div className="absolute inset-0 w-full h-full flex flex-col transition-transform duration-500 ease-out origin-center" style={{ transform: `rotate(${-roll}deg) translateY(${pitch * 8}px)` }}>
                          <div className="h-1/2 w-full bg-gradient-to-b from-sky-500 to-sky-300 border-b border-white"></div>
                          <div className="h-1/2 w-full bg-gradient-to-b from-amber-900 to-amber-950"></div>
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-12 text-[10px] font-bold text-white/80 opacity-60">
                              <div className="flex items-center gap-10"><span>10</span><div className="w-20 h-px bg-white"></div><span>10</span></div>
                              <div className="flex items-center gap-10"><span>05</span><div className="w-12 h-px bg-white"></div><span>05</span></div>
                              <div className="flex items-center gap-10"><span>05</span><div className="w-12 h-px bg-white"></div><span>05</span></div>
                              <div className="flex items-center gap-10"><span>10</span><div className="w-20 h-px bg-white"></div><span>10</span></div>
                          </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                          <div className="w-64 h-1 bg-g1000-amber border border-black rounded-full shadow-lg relative flex items-center justify-center">
                              <div className="w-2 h-2 bg-black rounded-full absolute"></div>
                              <div className="absolute left-0 w-20 h-2 bg-g1000-amber border border-black rounded-full"></div>
                              <div className="absolute right-0 w-20 h-2 bg-g1000-amber border border-black rounded-full"></div>
                          </div>
                          <div className="absolute top-4 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[15px] border-b-white transform -translate-y-1"></div>
                      </div>
                  </div>

                  <div className="w-20 h-full bg-[#111] border-l border-white/20 relative overflow-hidden shadow-inner flex flex-col items-start">
                      <div className="absolute top-0 w-full h-6 bg-zinc-900 border-b border-white/20 flex items-center justify-center text-[9px] text-zinc-500 font-bold uppercase tracking-widest">ALT</div>
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-full overflow-hidden">
                          {[-100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100].map(off => {
                              const val = Math.round(roundedAlt / 100) * 100 + off * 5;
                              if (val < 0) return null;
                              return (
                                  <div key={off} className="absolute left-0 flex items-center transition-transform duration-300" style={{ transform: `translateY(${off * 2.5}px)` }}>
                                      <div className="w-2 h-px bg-white/30"></div>
                                      <span className="text-[10px] font-bold text-white/50 ml-2">{val}</span>
                                  </div>
                              );
                          })}
                      </div>
                      <div className="absolute top-1/2 -translate-y-1/2 left-1 w-18 h-8 bg-black border border-white flex items-center justify-center text-xl font-black text-g1000-cyan shadow-xl z-20">
                          {roundedAlt}
                      </div>
                      <div className="absolute bottom-1 w-full text-center text-[8px] font-bold text-zinc-600">IN Hg 29.92</div>
                  </div>

                  <div className="w-10 h-full bg-black/40 border-l border-white/10 relative flex flex-col items-center py-4">
                      <div className="text-[8px] font-bold text-zinc-600">VSI</div>
                      <div className="flex-1 w-full relative">
                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-px h-[80%] bg-zinc-800"></div>
                         <div className={`absolute left-1/2 -translate-x-1/2 w-2 bg-emerald-500 transition-all duration-300`} 
                              style={{ 
                                  height: `${Math.min(40, Math.abs(verticalSpeed) / 10)}px`, 
                                  top: verticalSpeed < 0 ? '50%' : `calc(50% - ${Math.min(40, Math.abs(verticalSpeed) / 10)}px)`
                              }}
                         ></div>
                      </div>
                  </div>
              </div>

              <div className="h-40 bg-zinc-900/90 border-t border-white/10 relative flex items-center justify-around px-8">
                  <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500"><Wind className="w-3 h-3 text-sky-400" /> WND: {windDirection.toString().padStart(3, '0')}@{windSpeed}KT</div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500"><Eye className="w-3 h-3 text-emerald-400" /> VIS: {visibility} NM</div>
                  </div>

                  <div className="w-48 h-48 -mt-20 bg-black/80 rounded-full border-4 border-zinc-700 shadow-2xl relative flex items-center justify-center overflow-hidden">
                      <div className="w-full h-full absolute transition-transform duration-500" style={{ transform: `rotate(${-heading}deg)` }}>
                          {[0, 90, 180, 270].map(deg => (
                              <div key={deg} className="absolute top-0 left-1/2 h-full w-px origin-bottom" style={{ transform: `translateX(-50%) rotate(${deg}deg)` }}>
                                  <div className="w-1 h-3 bg-white"></div>
                                  <span className="absolute top-4 left-1/2 -translate-x-1/2 text-sm font-black text-g1000-amber" style={{ transform: `rotate(${-deg}deg)` }}>
                                      {deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : 'W'}
                                  </span>
                              </div>
                          ))}
                          {[30, 60, 120, 150, 210, 240, 300, 330].map(deg => (
                              <div key={deg} className="absolute top-0 left-1/2 h-full w-px origin-bottom" style={{ transform: `translateX(-50%) rotate(${deg}deg)` }}>
                                  <div className="w-px h-2 bg-white/40"></div>
                              </div>
                          ))}
                          <div className="absolute inset-0 transition-transform" style={{ transform: `rotate(${obs}deg)` }}>
                              <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-1 h-[30%] bg-g1000-magenta/40"></div>
                              <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[15px] border-b-g1000-magenta shadow-lg"></div>
                              <div className={`absolute top-[15%] bottom-[15%] w-1.5 bg-g1000-magenta transition-transform duration-300 shadow-xl ${isOff ? 'opacity-0' : 'opacity-100'}`}
                                   style={{ left: `calc(50% + ${cdiDeflection * 40}px - 0.75px)` }}></div>
                          </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <Plane className="w-8 h-8 text-white drop-shadow-lg fill-current stroke-black" />
                      </div>
                      <div className="absolute top-2 bg-black border border-white/20 px-2 py-0.5 rounded text-xs font-bold text-white shadow-xl z-20">
                          {Math.round(heading).toString().padStart(3, '0')}°
                      </div>
                  </div>

                  <div className="flex flex-col gap-2 text-right">
                      <div className="text-[10px] font-bold text-g1000-cyan uppercase tracking-widest">VOR1 {obs.toString().padStart(3, '0')}°</div>
                      <div className="text-xl font-black text-white font-mono">{currentDme} <span className="text-[10px] text-zinc-500">NM</span></div>
                      <div className="text-[10px] font-bold text-zinc-500 uppercase">{isTo ? 'TO STATION' : 'FROM STATION'}</div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="h-full w-full bg-[#050505] relative flex flex-col font-mono text-white select-none overflow-hidden">
      
      {/* Top Right Session Info */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10 shadow-xl flex items-center gap-4">
            <div>
                 <div className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase mb-1">Session Timer</div>
                 <div className="text-sm font-black font-mono text-white flex items-center gap-2">
                    <Clock className="w-3 h-3 text-g1000-cyan" />
                    {(Date.now() / 1000 % 86400).toFixed(0).padStart(5, '0')}
                 </div>
            </div>
        </div>
      </div>

      {/* LEFT SIDEBAR CONTROLS */}
      {/* Ensuring this is explicitly on the left */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-6 p-3 bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-slide-in-left">
        
        {/* Menu Toggle */}
        {menuItems && (
            <button 
                onClick={() => setShowSidebar(!showSidebar)} 
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group ${showSidebar ? 'bg-g1000-cyan text-black shadow-[0_0_20px_rgba(0,255,255,0.4)]' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
                title="Syllabus Menu"
            >
                <Menu className="w-5 h-5" />
            </button>
        )}

        {/* Environment Settings */}
        <button 
            onClick={() => setIsSettingsOpen(true)} 
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group ${isSettingsOpen ? 'bg-g1000-cyan text-black shadow-[0_0_20px_rgba(0,255,255,0.4)]' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
            title="Environment Settings"
        >
            <Sliders className="w-5 h-5" />
        </button>

        {/* Pause / Resume */}
        <button 
            onClick={() => { setIsPaused(!isPaused); playSound('click'); }} 
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
            title={isPaused ? "Resume Simulation" : "Pause Simulation"}
        >
            {isPaused ? <Play className="w-5 h-5 ml-1" /> : <Pause className="w-5 h-5" />}
        </button>

        {/* Reset Aircraft Position */}
        <button 
            onClick={() => {
                setPlanePos(getInitialPosition());
                setPhase(isInboundInterceptMission ? 'OUTBOUND' : isHomingMission ? 'HOMING' : isLandingMission ? 'FINAL_APPROACH' : isOutboundMission ? 'OUTBOUND' : 'INBOUND');
                playSound('click');
            }}
             className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white group"
             title="Reset Aircraft Position"
        >
            <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
        </button>

        <div className="w-8 h-px bg-white/10 mx-auto"></div>

        {/* Exit / Abort */}
        <button 
            onClick={onExit} 
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 bg-red-900/20 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white hover:border-red-500 shadow-lg"
            title="Abort Mission"
        >
            <LogOut className="w-5 h-5 ml-1" />
        </button>
      </div>
      
      {/* --- SIMULATION SETTINGS OVERLAY --- */}
      {isSettingsOpen && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-lg animate-fade-in">
              <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl shadow-[0_0_100px_rgba(0,255,255,0.2)] overflow-hidden">
                  <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <Sliders className="w-5 h-5 text-g1000-cyan" />
                        <h3 className="font-black text-lg uppercase tracking-tight">Simulation Environment</h3>
                      </div>
                      <button onClick={() => setIsSettingsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  
                  <div className="p-8 space-y-8">
                      {/* Wind Speed */}
                      <div className="space-y-3">
                          <div className="flex justify-between items-center">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Wind Speed</label>
                              <span className="text-sm font-black text-g1000-cyan">{windSpeed} KT</span>
                          </div>
                          <input type="range" min="0" max="50" step="1" value={windSpeed} onChange={(e) => setWindSpeed(Number(e.target.value))} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-g1000-cyan" />
                      </div>

                      {/* Wind Direction */}
                      <div className="space-y-3">
                          <div className="flex justify-between items-center">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Wind Direction</label>
                              <span className="text-sm font-black text-white">{windDirection.toString().padStart(3, '0')}°</span>
                          </div>
                          <input type="range" min="0" max="359" step="1" value={windDirection} onChange={(e) => setWindDirection(Number(e.target.value))} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white" />
                      </div>

                      {/* Visibility */}
                      <div className="space-y-3">
                          <div className="flex justify-between items-center">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Visibility</label>
                              <span className="text-sm font-black text-emerald-400">{visibility} NM</span>
                          </div>
                          <input type="range" min="0.1" max="10" step="0.1" value={visibility} onChange={(e) => setVisibility(Number(e.target.value))} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400" />
                      </div>

                      {/* Time of Day */}
                      <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Time of Day</label>
                          <div className="grid grid-cols-3 gap-3">
                              {(['DAY', 'DUSK', 'NIGHT'] as TimeOfDay[]).map(t => (
                                  <button key={t} onClick={() => setTimeOfDay(t)} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${timeOfDay === t ? 'bg-g1000-cyan border-white/20 text-black shadow-lg scale-105' : 'bg-white/5 border-white/5 text-white hover:bg-white/10'}`}>
                                      {t === 'DAY' ? <Sun className="w-5 h-5" /> : t === 'DUSK' ? <Cloud className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                      <span className="text-[8px] font-black tracking-widest uppercase">{t}</span>
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
                  
                  <div className="p-6 bg-zinc-800/30 flex justify-center">
                      <button onClick={() => setIsSettingsOpen(false)} className="bg-g1000-cyan text-black px-10 py-3 rounded-xl font-black text-xs tracking-widest uppercase hover:bg-cyan-400 transition-all shadow-xl active:scale-95">
                          Apply Conditions
                      </button>
                  </div>
              </div>
          </div>
      )}

      {menuItems && showSidebar && (
         <div className="absolute left-24 top-24 bottom-72 w-80 bg-zinc-950/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl z-40 overflow-hidden flex flex-col animate-slide-in-left">
            <div className="p-5 border-b border-white/5 bg-zinc-900/50">
               <h3 className="font-black text-lg uppercase tracking-tight flex items-center gap-3 text-white">
                  <Map className="w-5 h-5 text-g1000-cyan" /> SYLLABUS HUB
               </h3>
               <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em] mt-1">Instrument Flight Procedures</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                {menuItems.map((category, idx) => (
                    <div key={idx}>
                        <div className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-3 ml-1">{category.name}</div>
                        <div className="space-y-2">
                            {category.subModules?.map(mod => (
                                <button key={mod.id} onClick={() => handleMissionSelect(mod.id)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${
                                        missionId === mod.id ? 'bg-g1000-cyan border-white/20 text-black shadow-lg scale-[1.02]' : 'bg-white/5 border-white/5 text-white hover:bg-white/10 hover:border-white/20'
                                    }`}>
                                    <div>
                                        <div className="text-xs font-black uppercase tracking-tight">{mod.name}</div>
                                        <div className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${missionId === mod.id ? 'text-black/60' : 'text-zinc-500'}`}>{mod.type}</div>
                                    </div>
                                    {missionId === mod.id && <Activity className="w-4 h-4 animate-pulse" />}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
         </div>
      )}

      {/* --- ALERTS --- */}
      {emergencyAlert && <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-2xl font-black shadow-2xl animate-pulse flex items-center gap-4 z-50 border-2 border-white/20">
            <AlertCircle className="w-6 h-6" /> EMERGENCY: ENGINE LOSS • FLY STATION DIRECT
        </div>}

      {showPassageExplanation && <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md">
             <div className="bg-zinc-900 p-10 rounded-3xl border border-white/10 max-w-md text-center shadow-2xl">
                 <div className="w-20 h-20 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-emerald-500 shadow-2xl"><CheckCircle className="w-10 h-10 text-emerald-400" /></div>
                 <h2 className="text-3xl font-black text-white mb-3">STATION PASSAGE</h2>
                 <p className="text-zinc-400 text-sm mb-8 leading-relaxed font-bold uppercase tracking-tight">The TO/FROM indicator has reversed. Intercept the outbound radial to continue the procedure.</p>
                 <button onClick={() => { setShowPassageExplanation(false); setIsPaused(false); playSound('click'); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl text-xs tracking-[0.3em] uppercase transition-all shadow-xl active:scale-95">CONTINUE MISSION</button>
            </div>
        </div>}

      {/* --- SIM CANVAS --- */}
      <div className="flex-1 relative cursor-crosshair">
         <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="block" />
         
         {isPaused && !showPassageExplanation && !isCompleted && !showPTSelection && !courseChangeAlert && !isSettingsOpen && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-20">
              <button onClick={() => { setIsPaused(false); playSound('click'); }} className="group bg-white text-black px-12 py-6 rounded-2xl font-black text-xl hover:scale-105 transition-all shadow-2xl flex items-center gap-4">
                 <Play className="w-7 h-7 fill-current" /> INITIALIZE SYSTEM
              </button>
            </div>
         )}

         {isCompleted && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-xl z-[100]">
               <div className="bg-zinc-900 p-12 rounded-3xl border border-white/10 text-center shadow-2xl animate-fade-in scale-110">
                  <div className="w-24 h-24 bg-g1000-green/20 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-g1000-green shadow-[0_0_50px_rgba(0,255,0,0.4)]"><Award className="w-12 h-12 text-g1000-green" /></div>
                  <h2 className="text-4xl font-black text-white mb-3 tracking-tighter uppercase">Mission Success</h2>
                  <p className="text-zinc-500 text-[10px] mb-10 tracking-[0.5em] uppercase font-bold">Training objective completed within tolerances</p>
                  <button onClick={onExit} className="bg-g1000-green text-black px-10 py-4 rounded-xl font-black text-xs tracking-[0.3em] hover:bg-green-400 transition-all shadow-xl active:scale-95 uppercase">LOG FLIGHT & EXIT</button>
               </div>
            </div>
         )}
      </div>

      {/* --- EFIS INSTRUMENT PANEL --- */}
      <div className="h-72 shrink-0">
          {renderEFIS()}
      </div>
    </div>
  );
};

export default VORSimulator;