import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, UserCog, MoreHorizontal } from 'lucide-react';

const MOCK_USERS = [
  {
    id: '1',
    name: 'AHMAD SHALIHIN, S.H., M.H.',
    email: '196006021986121001@hakim.mahkamahagung.go.id',
    role: 'Hakim',
    org: 'Pengadilan Tinggi Kepulauan Riau',
    status: 'ACTIVE'
  },
  {
    id: '2',
    name: 'Dr ZULFAHMI, S.H., M.Hum.',
    email: '196105171988031008@hakim.mahkamahagung.go.id',
    role: 'Hakim',
    org: 'Pengadilan Tinggi Kepulauan Riau',
    status: 'ACTIVE'
  },
  {
    id: '3',
    name: 'ELIWARTI, S.H., M.H.',
    email: '196303121985032003@hakim.mahkamahagung.go.id',
    role: 'Hakim Tinggi',
    org: 'Pengadilan Tinggi Kepulauan Riau',
    status: 'ACTIVE'
  },
  {
    id: '4',
    name: 'WENDRA RAIS, S.H., M.H.',
    email: '196506301992121001@hakim.mahkamahagung.go.id',
    role: 'Hakim Tinggi',
    org: 'Pengadilan Tinggi Kepulauan Riau',
    status: 'ACTIVE'
  },
  {
    id: '5',
    name: 'ESTIONO, S.H., M.H.',
    email: '196503151992121001@hakim.mahkamahagung.go.id',
    role: 'Hakim Tinggi',
    org: 'Pengadilan Tinggi Kepulauan Riau',
    status: 'ACTIVE'
  },
  {
    id: '6',
    name: 'BAGUS IRAWAN, S.H., M.H.',
    email: '196308261988031003@hakim.mahkamahagung.go.id',
    role: 'Hakim Tinggi',
    org: 'Pengadilan Tinggi Kepulauan Riau',
    status: 'ACTIVE'
  },
  {
    id: '7',
    name: 'ELFIAN, S.H., M.H.',
    email: '196512111992121001@hakim.mahkamahagung.go.id',
    role: 'Hakim Tinggi',
    org: 'Pengadilan Tinggi Kepulauan Riau',
    status: 'ACTIVE'
  },
  {
    id: '8',
    name: 'MORGAN SIMANJUNTAK, S.H., M.Hum.',
    email: '196209221992121001@hakim.mahkamahagung.go.id',
    role: 'Hakim Tinggi',
    org: 'Pengadilan Tinggi Kepulauan Riau',
    status: 'ACTIVE'
  },
  {
    id: '9',
    name: 'DAHLIA PANJAITAN, S.H.',
    email: '196301101991032002@hakim.mahkamahagung.go.id',
    role: 'Hakim Tinggi',
    org: 'Pengadilan Tinggi Kepulauan Riau',
    status: 'ACTIVE'
  },
  {
    id: '10',
    name: 'Dr. M. SURYADI, S.H., M.H.',
    email: '1403010103624882@hakim.mahkamahagung.go.id',
    role: 'Hakim Ad Hoc',
    org: 'Pengadilan Tinggi Kepulauan Riau',
    status: 'ACTIVE'
  },
  {
    id: '11',
    name: 'SAPTA PUTRA, S.H.',
    email: '196809011996031001@panitera.mahkamahagung.go.id',
    role: 'Panitera',
    org: 'Pengadilan Tinggi Kepulauan Riau',
    status: 'ACTIVE'
  },
  {
    id: '12',
    name: 'AGUSMAN, S.H., M.H.',
    email: '196908201993031005@panitera.mahkamahagung.go.id',
    role: 'Panitera Muda',
    org: 'Pengadilan Tinggi Kepulauan Riau',
    status: 'ACTIVE'
  },
  {
    id: '13',
    name: 'NURLAILI, S.H., M.H.',
    email: '196505281994032001@panitera.mahkamahagung.go.id',
    role: 'Panitera Muda',
    org: 'Pengadilan Tinggi Kepulauan Riau',
    status: 'ACTIVE'
  },
  {
    id: '14',
    name: 'SYAIFUL ISLAMI, S.H.',
    email: '198409022009041004@panitera.mahkamahagung.go.id',
    role: 'Panitera Muda',
    org: 'Pengadilan Tinggi Kepulauan Riau',
    status: 'ACTIVE'
  },
  {
    id: '15',
    name: 'SUPRIADI, S.H.',
    email: '196511281993031003@panitera.mahkamahagung.go.id',
    role: 'Panitera Muda',
    org: 'Pengadilan Tinggi Kepulauan Riau',
    status: 'ACTIVE'
  },
  {
    id: '16',
    name: 'FERRY NITA, S.H.',
    email: '196904011988032001@panitera.mahkamahagung.go.id',
    role: 'Panitera Pengganti',
    org: 'Pengadilan Tinggi Kepulauan Riau',
    status: 'ACTIVE'
  },
  {
    id: '17',
    name: 'Budi Santoso, S.H.',
    email: 'budi.santoso@kejaksaan.go.id',
    role: 'Penuntut Umum',
    org: 'Kejaksaan Negeri Batam',
    status: 'ACTIVE'
  },
  {
    id: '18',
    name: 'Siti Aminah, S.H.',
    email: 'siti.aminah@kejaksaan.go.id',
    role: 'Jaksa Penyidik',
    org: 'Kejaksaan Tinggi Kepulauan Riau',
    status: 'ACTIVE'
  },
  {
    id: '19',
    name: 'Agus Pratama, S.H., M.H.',
    email: 'agus.pratama@pn-batam.go.id',
    role: 'Panitera',
    org: 'Pengadilan Negeri Batam',
    status: 'ACTIVE'
  },
  {
    id: '20',
    name: 'Rini Yulianti, S.H.',
    email: 'rini.yulianti@pn-tanjungpinang.go.id',
    role: 'Panitera Pengganti',
    org: 'Pengadilan Negeri Tanjungpinang',
    status: 'ACTIVE'
  },
  {
    id: '21',
    name: 'Admin Pusat',
    email: 'admin@cims.go.id',
    role: 'Administrasi Sistem',
    org: 'Mahkamah Agung',
    status: 'ACTIVE'
  },
  {
    id: '22',
    name: 'Petugas Rutan Batam',
    email: 'petugas@rutan-batam.go.id',
    role: 'Petugas Pemasyarakatan',
    org: 'Rutan Kelas IIA Batam',
    status: 'INACTIVE'
  }
];

export function UserManagementPage() {
  const [search, setSearch] = useState('');

  const filteredUsers = MOCK_USERS.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.org.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="Pengelolaan Pengguna"
        description="Kelola akses, peran (Role-Based Access Control), dan afiliasi instansi untuk pengguna sistem CIMS."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Daftar Pengguna</CardTitle>
            <CardDescription>Menampilkan {filteredUsers.length} pengguna terdaftar</CardDescription>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Tambah Pengguna
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Cari nama, email, atau instansi..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="shrink-0">
              <UserCog className="mr-2 h-4 w-4" /> Kelola Peran
            </Button>
          </div>

          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Pengguna</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Peran</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Instansi</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Tidak ada pengguna yang sesuai dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{user.name}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.org}</td>
                      <td className="px-4 py-3">
                        <Badge variant={user.status === 'ACTIVE' ? 'success' : 'outline'}>
                          {user.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
