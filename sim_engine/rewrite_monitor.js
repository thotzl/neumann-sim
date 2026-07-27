const fs = require('fs');

let lines = fs.readFileSync('monitor/src/App.tsx', 'utf8').split('\n');
let out = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (line.includes('const shipsHere = state.ships')) {
        skip = true;
        out.push(line);
        continue;
    }
    
    if (skip && line.includes('<InspectorPanel')) {
        skip = false;
        // Inject clean mapping
        out.push(`               return (
                 <div key={s.name} onClick={(e) => { e.stopPropagation(); setSelection({type: 'system', id: s.name}); }} style={{ position: 'absolute', left: s.x * SCALE, top: s.y * SCALE, transform: 'translate(-50%, -50%)', textAlign: 'center', cursor: 'pointer' }}>
                   {/* System Core */}
                   <div style={{ width: '40px', height: '40px', background: colors.solid, borderRadius: '50%', border: isSel ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)', boxShadow: \`0 0 50px \${colors.glow}, inset 0 0 10px rgba(255,255,255,0.3)\`, margin: '0 auto', transition: 'all 0.2s', position: 'relative' }}>
                      {/* Telemetry / Infrastructure dots */}
                      {s.infra && s.infra.length > 0 && (
                          <div style={{ position: 'absolute', top: '-15px', right: '-15px', background: 'rgba(0,0,0,0.8)', border: '1px solid #10b981', borderRadius: '4px', padding: '2px 4px', fontSize: '10px', color: '#10b981', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                             {s.infra.map(i => {
                                let icon = "🏢";
                                if (i.type === "matter_silo") icon = "📦";
                                else if (i.type === "solar_collector") icon = "☀️";
                                else if (i.type === "matter_refinery") icon = "🏭";
                                else if (i.type === "shipyard" || i.type === "advanced_shipyard") icon = "🏗️";
                                else if (i.type === "battery_bank") icon = "🔋";
                                else if (i.type === "comms_relay") icon = "📡";
                                else if (i.type === "mind_forge") icon = "🧠";
                                else if (i.type === "deep_space_scanner") icon = "🔭";
                                else if (i.type === "sem_matrix") icon = "💠";
                                return <div key={i.id} title={\`\${i.type} L\${i.level}\`}>\${icon} L\${i.level}</div>
                             })}
                          </div>
                      )}
                   </div>
                   
                   <div style={{ marginTop: '12px', fontWeight: 700, fontSize: '1rem', color: isSel ? '#fff' : '#94a3b8', textShadow: '0 0 10px black', letterSpacing: '1px' }}>{s.display_name || s.name}</div>
                   
                   <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginTop: '12px', maxWidth: '140px' }}>
                      {/* Ships */}
                      {shipsHere.map(ship => {
                          const pilot = bobsHere.find(a => a.active_ship_id === ship.id);
                          const isASel = selection?.type === 'agent' && pilot && selection.id === pilot.id;
                          const shipColor = pilot ? (isASel ? '#fff' : '#0ea5e9') : '#64748b';
                          return (
                              <div key={\`ship-\${ship.id}\`} title={\`\${ship.name} \${pilot ? '(Manned)' : '(Empty)'}\`} onClick={(e) => { e.stopPropagation(); if (pilot) setSelection({type: 'agent', id: pilot.id}); }} style={{ cursor: pilot ? 'pointer' : 'default', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                 <div style={{ width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderBottom: \`14px solid \${shipColor}\`, filter: \`drop-shadow(0 0 5px \${shipColor})\`, transition: 'all 0.2s', transform: isASel ? 'scale(1.2)' : 'scale(1)' }} />
                              </div>
                          );
                      })}
                      {/* Matrix Bobs (Squares) */}
                      {bobsHere.filter(a => !a.active_ship_id).map(a => {
                        const isASel = selection?.id === a.id;
                        return (
                           <div key={a.id} title={\`Matrix: \${a.id}\`} onClick={(e) => { e.stopPropagation(); setSelection({type: 'agent', id: a.id}); }} style={{ width: '10px', height: '10px', background: isASel ? '#fff' : '#38bdf8', border: '1px solid #fff', cursor: 'pointer', transition: 'all 0.2s', transform: isASel ? 'scale(1.3)' : 'scale(1)' }} />
                        );
                      })}
                   </div>
                 </div>
               );
            })}
          </div>
        </div>`);
        out.push(line);
        continue;
    }

    if (!skip) out.push(line);
}

fs.writeFileSync('monitor/src/App.tsx', out.join('\n'));