import React from 'react';
import { Users, Share2, Check, Crown, ChevronDown } from 'lucide-react';
import { GarageMember, Department } from '../types';

export interface RosterScreenProps {
  members: GarageMember[];
  departments: Department[];
  userRole: 'owner' | 'hod' | 'worker';
  currentUserDepartmentId?: string | null;
  copiedLink: boolean;
  onCopyInviteLink: () => void;
  onAssignDepartment: (memberId: string, deptId: string | null) => void;
  onToggleHod: (member: GarageMember) => void;
}

export const RosterScreen: React.FC<RosterScreenProps> = ({
  members,
  departments,
  userRole,
  currentUserDepartmentId,
  copiedLink,
  onCopyInviteLink,
  onAssignDepartment,
  onToggleHod,
}) => {
  // Apply filtering for HOD
  const displayedMembers = userRole === 'hod'
    ? members.filter((m) => m.department_id === currentUserDepartmentId)
    : members; // owner sees all

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-[#34D399]" />
            {userRole === 'hod' ? 'Department Staff Roster' : 'Garage Staff Roster & Hierarchy'}
          </h3>
          <p className="text-xs text-stone-400">
            {userRole === 'hod' ? 'View technicians currently assigned to this department.' : 'Assign staff members to departments and designate Heads of Department (HOD).'}
          </p>
        </div>
        {userRole === 'owner' && (
          <button onClick={onCopyInviteLink} className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-bold transition flex items-center gap-2 self-start sm:self-auto">
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{copiedLink ? 'Invite Link Copied!' : 'Copy Staff Invite Link'}</span>
          </button>
        )}
      </div>

      {displayedMembers.length === 0 ? (
        <div className="bg-stone-900/40 border border-dashed border-stone-800 rounded-2xl p-12 text-center text-stone-500 space-y-4">
          <Users className="w-12 h-12 mx-auto text-stone-600 opacity-60" />
          <div><p className="font-bold text-stone-300 text-sm">No Garage Members Found</p></div>
        </div>
      ) : (
        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950 text-stone-400 uppercase font-mono tracking-wider text-[11px] border-b border-stone-800">
                <tr>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Assigned Department</th>
                  {userRole === 'owner' && (
                    <>
                      <th className="py-3.5 px-4 text-center">HOD Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {[...displayedMembers]
                  .sort((a, b) => (a.department_id || 'zzzz').localeCompare(b.department_id || 'zzzz'))
                  .map((member) => {
                  const isMemberHod = member.role === 'hod';
                  let roleBadges = [{ text: 'TECHNICIAN', styles: 'bg-stone-800 text-stone-300 border-stone-700' }];

                  if (member.role === 'owner') {
                    roleBadges = [{ text: 'OWNER', styles: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' }];
                  } else if (isMemberHod) {
                    roleBadges = [
                      { text: 'HOD', styles: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
                      { text: 'LEAD', styles: 'bg-amber-500/10 text-amber-400 border-amber-500/30' }
                    ];
                  }

                  return (
                    <tr key={member.id} className="hover:bg-stone-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{member.full_name || (member.role === 'owner' ? 'Workshop Administrator' : 'Unnamed Staff')}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          {roleBadges.map((badge, idx) => (
                            <span key={idx} className={`px-2.5 py-0.5 rounded-full text-[10px] whitespace-nowrap font-extrabold uppercase tracking-wide border ${badge.styles}`}>
                              {badge.text}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="relative max-w-[220px]">
                          {userRole === 'owner' ? (
                            <>
                              <select value={member.department_id || ''} onChange={(e) => onAssignDepartment(member.id, e.target.value || null)} className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white appearance-none pr-8 focus:outline-none focus:border-emerald-500">
                                <option value="">-- Unassigned --</option>
                                {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </>
                          ) : (
                            <span className="text-stone-300">
                              {departments.find((d) => d.id === member.department_id)?.name || 'Unassigned'}
                            </span>
                          )}
                        </div>
                      </td>
                      {userRole === 'owner' && (
                        <>
                          <td className="py-3.5 px-4 text-center">
                            <button onClick={() => onToggleHod(member)} className={`px-3 py-1 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 border ${isMemberHod ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' : 'bg-stone-800/80 text-stone-400 border-stone-700 hover:text-stone-200'}`}>
                              <Crown className={`w-3.5 h-3.5 ${isMemberHod ? 'text-amber-400' : 'text-stone-500'}`} />
                              <span>{isMemberHod ? 'HOD Active' : 'Promote HOD'}</span>
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {member.department_id ? (
                              <button onClick={() => onAssignDepartment(member.id, null)} className="text-[11px] text-stone-400 hover:text-rose-400 transition">Unassign</button>
                            ) : <span className="text-[11px] text-stone-500 italic">None</span>}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
