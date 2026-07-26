'use client';

import { useState, useEffect } from 'react';
import { X, Upload, User, Car, FileText } from 'lucide-react';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';

export default function AddDriverModal({ onClose, onSave }) {
  const modalRef = useFocusTrap(true, onClose);
  const [activeTab, setActiveTab] = useState('profile');
  const [profileImage, setProfileImage] = useState(null);
  const [vehicleImage, setVehicleImage] = useState(null);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'vehicle', label: 'Vehicle', icon: Car },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    userName: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'Driver',
    make: '',
    model: '',
    color: '',
    registrationNo: '',
    lastInspectionOn: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Clean up object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (profileImage) URL.revokeObjectURL(profileImage);
      if (vehicleImage) URL.revokeObjectURL(vehicleImage);
    };
  }, [profileImage, vehicleImage]);

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      if (type === 'profile') {
        if (profileImage) URL.revokeObjectURL(profileImage);
        setProfileImage(objectUrl);
      } else if (type === 'vehicle') {
        if (vehicleImage) URL.revokeObjectURL(vehicleImage);
        setVehicleImage(objectUrl);
      }
    }
  };

  const handleSave = () => {
    onSave?.(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-driver-modal-title"
        className="bg-white w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in-scale"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="add-driver-modal-title" className="text-base font-semibold text-gray-900">Add New Driver</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="btn-icon p-1.5 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {/* Profile Image Upload */}
              <div className="col-span-2">
                <label htmlFor="profile-image-upload">Profile Image</label>
                <div className="relative w-full h-40 file-upload-zone overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Upload className="w-6 h-6 mb-1.5" aria-hidden="true" />
                      <span className="text-xs">Click to upload profile image</span>
                    </div>
                  )}
                  <input
                    id="profile-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'profile')}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="driver-firstName">First Name</label>
                <input id="driver-firstName" type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="First name" />
              </div>
              <div>
                <label htmlFor="driver-lastName">Last Name</label>
                <input id="driver-lastName" type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Last name" />
              </div>
              <div>
                <label htmlFor="driver-userName">Username</label>
                <input id="driver-userName" type="text" name="userName" value={formData.userName} onChange={handleInputChange} placeholder="e.g. Driver-12" />
              </div>
              <div>
                <label htmlFor="driver-email">Email</label>
                <input id="driver-email" type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="email@example.com" />
              </div>
              <div>
                <label htmlFor="driver-phoneNumber">Phone Number</label>
                <input id="driver-phoneNumber" type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} placeholder="+974 XXXX XXXX" />
              </div>
              <div>
                <label htmlFor="driver-role">Role</label>
                <select id="driver-role" name="role" value={formData.role} onChange={handleInputChange}>
                  <option value="Driver">Driver</option>
                  <option value="Senior Driver">Senior Driver</option>
                  <option value="Premium Driver">Premium Driver</option>
                </select>
              </div>
              <div className="col-span-2">
                <label htmlFor="driver-password">Password</label>
                <input id="driver-password" type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="Create a strong password" />
              </div>
            </div>
          )}

          {activeTab === 'vehicle' && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {/* Vehicle Image Upload */}
              <div className="col-span-2">
                <label htmlFor="vehicle-image-upload">Vehicle Image</label>
                <div className="relative w-full h-40 file-upload-zone overflow-hidden">
                  {vehicleImage ? (
                    <img src={vehicleImage} alt="Vehicle preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Upload className="w-6 h-6 mb-1.5" aria-hidden="true" />
                      <span className="text-xs">Click to upload vehicle image</span>
                    </div>
                  )}
                  <input
                    id="vehicle-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'vehicle')}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="driver-make">Make</label>
                <input id="driver-make" type="text" name="make" value={formData.make} onChange={handleInputChange} placeholder="e.g. E-200" />
              </div>
              <div>
                <label htmlFor="driver-model">Model</label>
                <input id="driver-model" type="text" name="model" value={formData.model} onChange={handleInputChange} placeholder="e.g. Mercedes" />
              </div>
              <div>
                <label htmlFor="driver-registrationNo">Registration No</label>
                <input id="driver-registrationNo" type="text" name="registrationNo" value={formData.registrationNo} onChange={handleInputChange} placeholder="e.g. UK1234" />
              </div>
              <div>
                <label htmlFor="driver-lastInspectionOn">Last Inspection On</label>
                <input id="driver-lastInspectionOn" type="date" name="lastInspectionOn" value={formData.lastInspectionOn} onChange={handleInputChange} />
              </div>
              <div className="col-span-2">
                <label htmlFor="driver-color">Color</label>
                <input id="driver-color" type="text" name="color" value={formData.color} onChange={handleInputChange} placeholder="e.g. White" />
              </div>
              <div className="col-span-2">
                <button type="button" className="w-full px-4 py-2.5 text-sm font-medium bg-gray-800 text-white hover:bg-gray-900 transition-colors">
                  Schedule Inspection
                </button>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Documents</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    'Driving License',
                    'Vehicle Registration',
                    'Insurance Certificate',
                    'Medical Certificate',
                    'Background Check',
                    'ID Card',
                    'Address Proof',
                  ].map((doc, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-sm text-gray-900">{doc}</td>
                      <td className="px-4 py-3">
                        <button aria-label={`Upload ${doc}`} className="p-2 text-[var(--primary)] hover:bg-teal-50 transition-colors">
                          <Upload className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[#0d9488] transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
