
import React, { useState, useEffect, useRef, useCallback } from 'react';

// TypeScript declarations for the experimental ProximitySensor API.
// This is necessary because it's not yet part of the standard TypeScript DOM library.
// We model the API based on the Generic Sensor API specification where Sensor is a base class
// that extends EventTarget. This fixes the type errors by providing the correct inheritance.
interface SensorOptions {
  frequency?: number;
}

// The base Sensor class, which other sensors inherit from. It extends EventTarget.
declare class Sensor extends EventTarget {
  constructor(options?: SensorOptions);
  start(): void;
  stop(): void;
  onerror: ((this: this, ev: any) => any) | null;
}

// The ProximitySensor class, which provides specific proximity readings.
declare class ProximitySensor extends Sensor {
  constructor(options?: SensorOptions);
  readonly distance: number; // in cm
  readonly max: number;
  readonly near: boolean;
}


const App: React.FC = () => {
    const [count, setCount] = useState<number>(0);
    const [isCounting, setIsCounting] = useState<boolean>(false);
    const [status, setStatus] = useState<string>('센서 초기화 중...');
    const [isSupported, setIsSupported] = useState<boolean>(true);
    const [flash, setFlash] = useState<boolean>(false);

    const sensor = useRef<ProximitySensor | null>(null);
    const lastDetectionTime = useRef<number>(0);

    // Effect to check for API support on mount and clean up sensor on unmount.
    useEffect(() => {
        if (!('ProximitySensor' in window)) {
            setStatus('이 브라우저는 근접 센서 API를 지원하지 않습니다.');
            setIsSupported(false);
        } else {
            setStatus('준비 완료. "시작" 버튼을 눌러 시작하세요.');
        }

        // Cleanup: stop the sensor when the component unmounts.
        // This will run regardless of when the sensor was initialized.
        return () => {
            if (sensor.current) {
                sensor.current.stop();
            }
        };
    }, []);

    // Callback for handling sensor readings, memoized for performance
    const handleReading = useCallback(() => {
        if (!sensor.current) return;

        // Count a rep if the sensor distance is less than 5 cm
        if (sensor.current.distance < 5) {
            const now = Date.now();
            // Cooldown of 750ms to prevent multiple counts for a single push-up
            if (now - lastDetectionTime.current > 750) {
                lastDetectionTime.current = now;
                setCount(prevCount => prevCount + 1);
                // Trigger visual feedback flash
                setFlash(true);
                setTimeout(() => setFlash(false), 200);
            }
        }
    }, []);

    // Effect to add/remove the 'reading' event listener based on the 'isCounting' state
    useEffect(() => {
        const currentSensor = sensor.current;
        if (isCounting && currentSensor) {
            currentSensor.addEventListener('reading', handleReading);
            setStatus('카운트 중... 화면에 가까이 다가가세요!');
        }

        // Cleanup function for this effect
        return () => {
            if (currentSensor) {
                currentSensor.removeEventListener('reading', handleReading);
            }
        };
    }, [isCounting, handleReading]);

    // Handler to initialize the sensor and toggle the counting state
    const toggleCounting = async () => {
        if (!isSupported) return;

        // Initialize the sensor on the first click, which is a user gesture
        if (!sensor.current) {
            try {
                setStatus('센서 권한을 요청합니다...');
                const proximitySensor = new ProximitySensor({ frequency: 10 });
                sensor.current = proximitySensor;
                
                sensor.current.onerror = (event: any) => {
                    if (event.error.name === 'NotAllowedError') {
                        setStatus('센서 사용 권한이 거부되었습니다.');
                    } else if (event.error.name === 'NotReadableError') {
                        setStatus('지금은 센서를 사용할 수 없습니다.');
                    } else {
                        setStatus('센서 오류: ' + event.error.name);
                    }
                    setIsSupported(false);
                    sensor.current?.stop();
                };

                sensor.current.start();
                
            } catch (error: any) {
                if (error.name === 'SecurityError') {
                     setStatus('센서를 사용하려면 보안 연결(HTTPS)이 필요합니다.');
                } else {
                     setStatus('센서를 초기화할 수 없습니다: ' + error.name);
                }
                setIsSupported(false);
                return; // Exit if initialization fails
            }
        }

        const nextIsCounting = !isCounting;
        setIsCounting(nextIsCounting);
        if (!nextIsCounting) {
            setStatus('일시정지됨. "시작" 버튼을 눌러 다시 시작하세요.');
        }
    };

    // Handler to reset the count to zero
    const resetCount = () => {
        setCount(0);
        lastDetectionTime.current = 0;
        if (!isCounting) {
            setStatus('준비 완료. "시작" 버튼을 눌러 시작하세요.');
        }
    };

    return (
        <main className={`bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center font-sans p-4 transition-colors duration-200 ${flash ? 'bg-green-900' : ''}`}>
            <div className="absolute top-8 text-center px-6">
                <h1 className="text-4xl font-bold text-gray-100">푸시업 프로</h1>
                <p className="text-gray-400 mt-2 min-h-[24px]">{status}</p>
            </div>
            
            <div className="relative flex items-center justify-center my-8">
                 <p className="text-9xl md:text-[250px] font-bold tracking-tighter text-white" style={{ textShadow: '0 0 30px rgba(74, 222, 128, 0.5)' }}>
                    {count}
                </p>
            </div>

            <div className="flex items-center space-x-4">
                <button
                    onClick={toggleCounting}
                    disabled={!isSupported}
                    className={`w-40 px-6 py-4 text-xl font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                        isCounting 
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-900 focus:ring-yellow-400'
                        : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                    }`}
                >
                    {isCounting ? '일시정지' : '시작'}
                </button>
                <button
                    onClick={resetCount}
                    disabled={!isSupported}
                    className="w-40 px-6 py-4 text-xl font-semibold bg-red-700 hover:bg-red-800 text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    리셋
                </button>
            </div>

            <div className="absolute bottom-6 text-center text-gray-500 text-xs md:text-sm px-6">
                <p>휴대폰을 바닥에 놓고 얼굴을 화면 상단에 가까이 가져가면 횟수가 카운트됩니다.</p>
                <p className="mt-1">근접 센서를 지원하는 브라우저(예: 안드로이드용 크롬) 및 HTTPS 연결이 필요합니다.</p>
            </div>
        </main>
    );
};

export default App;
