'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader, X, User, Phone, Mail, Car, MapPin, Clock, CreditCard, Settings } from 'lucide-react';
import { bookingService } from '../../utils/axiosInstance';
import PricingCard from './PricingCard';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';

export default function CreateBookingModal({ isOpen, onClose, onCreated, showToast }) {
    const { user } = useAuth();
    const modalRef = useFocusTrap(isOpen, onClose);
    const [loading, setLoading] = useState(false);
    const [duration, setDuration] = useState(44);
    const [selectedPricingPlan, setSelectedPricingPlan] = useState('perMinute');
    const [calculatedPrice, setCalculatedPrice] = useState(0);

    const [form, setForm] = useState({
        passenger_name: '',
        contact_number: '',
        email: '',
        car_name: '',
        car_id: '',
        date: '',
        time: '',
        date_time: '',
        price: '',
        from_address: '',
        to_address: '',
        from_lat: '',
        from_lng: '',
        to_lat: '',
        to_lng: '',
        no_of_passengers: '',
        hand_laggages: '',
        luggage: '',
        payment_method: '',
        special_instructions: '',
        servics: '',
        sub_servics: '',
        subto_sub_servics: '',
        garage_name: '',
        issue: '',
        center_name: '',
        driver_price: '',
        commission: '',
        plan: '',
        estimate: '',
        payment_channel: '',
        all_lat_lng: '',
        job_start_time: '',
        job_end_time: '',
        job_duration: '',
        service_type: '',
        base_fare: '',
        platform_fee: '',
        distance: '',
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (name === 'job_duration') {
            const durationInMinutes = parseInt(value) || 0;
            setDuration(durationInMinutes);
        }
    };

    const handlePlanSelect = ({ plan, price, duration }) => {
        setSelectedPricingPlan(plan);
        setCalculatedPrice(price);
        setForm((prev) => ({
            ...prev,
            plan: plan,
            price: price,
            job_duration: duration.toString()
        }));
    };

    const handleDurationChange = (e) => {
        const durationInMinutes = parseInt(e.target.value) || 0;
        setDuration(durationInMinutes);
        setForm((prev) => ({
            ...prev,
            job_duration: durationInMinutes.toString()
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const date_time = form.date && form.time ? `${form.date} ${form.time}` : form.date || form.time || '';
            const fd = new FormData();
            const localUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
            const localUserId = localUser ? (() => { try { return JSON.parse(localUser)?.id || JSON.parse(localUser)?.user_id } catch { return null } })() : null;
            const ctxUserId = user?.id || user?.user_id || null;
            const resolvedUserId = ctxUserId || localUserId || null;

            const fields = {
                status: 'pending',
                passenger_name: form.passenger_name || '',
                car_name: form.car_name || '',
                car_id: form.car_id || '',
                date: form.date || '',
                time: form.time || '',
                date_time: date_time || '',
                price: form.price || '',
                from_address: form.from_address || '',
                to_address: form.to_address || '',
                from_lat: form.from_lat || '',
                from_lng: form.from_lng || '',
                to_lat: form.to_lat || '',
                to_lng: form.to_lng || '',
                contact_number: form.contact_number || '',
                servics: '',
                sub_servics: '',
                subto_sub_servics: '',
                garage_name: '',
                issue: '',
                center_name: '',
                email: form.email || '',
                no_of_passengers: form.no_of_passengers || '',
                hand_laggages: form.hand_laggages || '',
                luggage: form.luggage || '',
                driver_price: '',
                commission: '',
                plan: '',
                payment_method: form.payment_method || '',
                special_instructions: form.special_instructions || '',
                estimate: '',
                payment_channel: '',
                all_lat_lng: '',
                job_start_time: '',
                job_end_time: '',
                job_duration: '',
                service_type: '',
                base_fare: '',
                platform_fee: '',
                distance: '',
            };

            Object.entries(fields).forEach(([k, v]) => {
                if (k === 'user_id') return;
                fd.append(k, v);
            });

            if (resolvedUserId && !Number.isNaN(Number(resolvedUserId))) {
                fd.append('user_id', String(resolvedUserId));
            }

            await bookingService.createBooking(fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            showToast?.('Booking created successfully!', 'success');
            onCreated?.();
            onClose?.();
        } catch (err) {
            console.error('Create booking error', err);
            showToast?.(err?.message || 'Failed to create booking', 'error');
        } finally {
            setLoading(false);
        }
    };

    const SectionHeader = ({ icon: Icon, title }) => (
        <div className="col-span-1 md:col-span-2 flex items-center gap-2 pt-4 mt-2 border-t border-gray-100 first:pt-0 first:mt-0 first:border-0">
            <Icon className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/40 modal-backdrop z-50 flex items-center justify-center p-4">
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-booking-modal-title"
                className="bg-white shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-scale"
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 id="create-booking-modal-title" className="text-base font-semibold text-gray-900">Create New Booking</h2>
                    <button onClick={onClose} aria-label="Close modal" className="btn-icon p-1.5 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">

                        {/* Passenger Info */}
                        <SectionHeader icon={User} title="Passenger Information" />
                        <div>
                            <label htmlFor="booking-passenger_name">Passenger Name</label>
                            <input id="booking-passenger_name" name="passenger_name" value={form.passenger_name} onChange={handleChange} placeholder="Full name" />
                        </div>
                        <div>
                            <label htmlFor="booking-contact_number">Contact Number</label>
                            <input id="booking-contact_number" name="contact_number" value={form.contact_number} onChange={handleChange} placeholder="+974 XXXX XXXX" />
                        </div>
                        <div>
                            <label htmlFor="booking-email">Email</label>
                            <input id="booking-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" />
                        </div>
                        <div>
                            <label htmlFor="booking-no_of_passengers">No. Passengers</label>
                            <input id="booking-no_of_passengers" name="no_of_passengers" type="number" value={form.no_of_passengers} onChange={handleChange} placeholder="1" />
                        </div>

                        {/* Vehicle Info */}
                        <SectionHeader icon={Car} title="Vehicle" />
                        <div>
                            <label htmlFor="booking-car_name">Vehicle Name</label>
                            <input id="booking-car_name" name="car_name" value={form.car_name} onChange={handleChange} placeholder="e.g. Mercedes E-Class" />
                        </div>
                        <div>
                            <label htmlFor="booking-car_id">Vehicle ID</label>
                            <input id="booking-car_id" name="car_id" value={form.car_id} onChange={handleChange} placeholder="e.g. VH-001" />
                        </div>

                        {/* Schedule */}
                        <SectionHeader icon={Clock} title="Schedule" />
                        <div>
                            <label htmlFor="booking-date">Date</label>
                            <input id="booking-date" name="date" type="date" value={form.date} onChange={handleChange} />
                        </div>
                        <div>
                            <label htmlFor="booking-time">Time</label>
                            <input id="booking-time" name="time" type="time" value={form.time} onChange={handleChange} />
                        </div>
                        <div>
                            <label htmlFor="booking-date_time">Date & Time (override)</label>
                            <input id="booking-date_time" name="date_time" type="text" value={form.date_time} onChange={handleChange} placeholder="YYYY-MM-DD HH:mm" />
                        </div>
                        <div>
                            <label htmlFor="booking-job_duration">Job Duration (minutes)</label>
                            <input
                                id="booking-job_duration"
                                name="job_duration"
                                type="number"
                                value={form.job_duration}
                                onChange={handleDurationChange}
                                placeholder="e.g. 44"
                            />
                        </div>

                        {/* Location */}
                        <SectionHeader icon={MapPin} title="Location" />
                        <div className="md:col-span-2">
                            <label htmlFor="booking-from_address">Pickup Address</label>
                            <input id="booking-from_address" name="from_address" value={form.from_address} onChange={handleChange} placeholder="Enter pickup location" />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="booking-to_address">Dropoff Address</label>
                            <input id="booking-to_address" name="to_address" value={form.to_address} onChange={handleChange} placeholder="Enter dropoff location" />
                        </div>
                        <div>
                            <label htmlFor="booking-from_lat">From Lat</label>
                            <input id="booking-from_lat" name="from_lat" value={form.from_lat} onChange={handleChange} placeholder="25.2854" />
                        </div>
                        <div>
                            <label htmlFor="booking-from_lng">From Lng</label>
                            <input id="booking-from_lng" name="from_lng" value={form.from_lng} onChange={handleChange} placeholder="51.5310" />
                        </div>
                        <div>
                            <label htmlFor="booking-to_lat">To Lat</label>
                            <input id="booking-to_lat" name="to_lat" value={form.to_lat} onChange={handleChange} placeholder="25.2854" />
                        </div>
                        <div>
                            <label htmlFor="booking-to_lng">To Lng</label>
                            <input id="booking-to_lng" name="to_lng" value={form.to_lng} onChange={handleChange} placeholder="51.5310" />
                        </div>
                        <div>
                            <label htmlFor="booking-distance">Distance</label>
                            <input id="booking-distance" name="distance" value={form.distance} onChange={handleChange} placeholder="e.g. 15 km" />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="booking-all_lat_lng">All Lat/Lng (JSON)</label>
                            <input id="booking-all_lat_lng" name="all_lat_lng" value={form.all_lat_lng} onChange={handleChange} placeholder='[[lat,lng],[lat,lng]]' />
                        </div>

                        {/* Luggage */}
                        <SectionHeader icon={Car} title="Luggage" />
                        <div>
                            <label htmlFor="booking-hand_laggages">Hand Luggage</label>
                            <input id="booking-hand_laggages" name="hand_laggages" type="number" value={form.hand_laggages} onChange={handleChange} placeholder="0" />
                        </div>
                        <div>
                            <label htmlFor="booking-luggage">Luggage</label>
                            <input id="booking-luggage" name="luggage" type="number" value={form.luggage} onChange={handleChange} placeholder="0" />
                        </div>

                        {/* Pricing */}
                        <SectionHeader icon={CreditCard} title="Pricing & Payment" />
                        <div>
                            <label htmlFor="booking-price">Price</label>
                            <input id="booking-price" name="price" type="number" value={form.price} onChange={handleChange} placeholder="0.00" />
                        </div>
                        <div>
                            <label htmlFor="booking-payment_method">Payment Method</label>
                            <select id="booking-payment_method" name="payment_method" value={form.payment_method} onChange={handleChange}>
                                <option value="">Select method</option>
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="online">Online</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="booking-driver_price">Driver Price</label>
                            <input id="booking-driver_price" name="driver_price" type="number" value={form.driver_price} onChange={handleChange} placeholder="0.00" />
                        </div>
                        <div>
                            <label htmlFor="booking-commission">Commission</label>
                            <input id="booking-commission" name="commission" type="number" value={form.commission} onChange={handleChange} placeholder="0.00" />
                        </div>
                        <div>
                            <label htmlFor="booking-base_fare">Base Fare</label>
                            <input id="booking-base_fare" name="base_fare" type="number" value={form.base_fare} onChange={handleChange} placeholder="0.00" />
                        </div>
                        <div>
                            <label htmlFor="booking-platform_fee">Platform Fee</label>
                            <input id="booking-platform_fee" name="platform_fee" type="number" value={form.platform_fee} onChange={handleChange} placeholder="0.00" />
                        </div>
                        <div>
                            <label htmlFor="booking-estimate">Estimate</label>
                            <input id="booking-estimate" name="estimate" value={form.estimate} onChange={handleChange} placeholder="Fare estimate" />
                        </div>
                        <div>
                            <label htmlFor="booking-payment_channel">Payment Channel</label>
                            <input id="booking-payment_channel" name="payment_channel" value={form.payment_channel} onChange={handleChange} placeholder="e.g. Stripe" />
                        </div>

                        {/* Service */}
                        <SectionHeader icon={Settings} title="Service Details" />
                        <div>
                            <label htmlFor="booking-service_type">Service Type</label>
                            <input id="booking-service_type" name="service_type" value={form.service_type} onChange={handleChange} placeholder="e.g. Chauffeur" />
                        </div>
                        <div>
                            <label htmlFor="booking-plan">Plan</label>
                            <input id="booking-plan" name="plan" value={form.plan} onChange={handleChange} placeholder="e.g. perMinute" />
                        </div>
                        <div>
                            <label htmlFor="booking-servics">Service / Category</label>
                            <input id="booking-servics" name="servics" value={form.servics} onChange={handleChange} placeholder="Category" />
                        </div>
                        <div>
                            <label htmlFor="booking-sub_servics">Sub Services</label>
                            <input id="booking-sub_servics" name="sub_servics" value={form.sub_servics} onChange={handleChange} placeholder="Sub category" />
                        </div>
                        <div>
                            <label htmlFor="booking-subto_sub_servics">Sub-Sub Services</label>
                            <input id="booking-subto_sub_servics" name="subto_sub_servics" value={form.subto_sub_servics} onChange={handleChange} placeholder="Sub-sub category" />
                        </div>
                        <div>
                            <label htmlFor="booking-garage_name">Garage Name</label>
                            <input id="booking-garage_name" name="garage_name" value={form.garage_name} onChange={handleChange} placeholder="Garage" />
                        </div>
                        <div>
                            <label htmlFor="booking-issue">Issue</label>
                            <input id="booking-issue" name="issue" value={form.issue} onChange={handleChange} placeholder="Describe issue" />
                        </div>
                        <div>
                            <label htmlFor="booking-center_name">Center Name</label>
                            <input id="booking-center_name" name="center_name" value={form.center_name} onChange={handleChange} placeholder="Service center" />
                        </div>

                        {/* Job Timing */}
                        <SectionHeader icon={Clock} title="Job Timing" />
                        <div>
                            <label htmlFor="booking-job_start_time">Job Start Time</label>
                            <input id="booking-job_start_time" name="job_start_time" value={form.job_start_time} onChange={handleChange} placeholder="YYYY-MM-DD HH:mm:ss" />
                        </div>
                        <div>
                            <label htmlFor="booking-job_end_time">Job End Time</label>
                            <input id="booking-job_end_time" name="job_end_time" value={form.job_end_time} onChange={handleChange} placeholder="YYYY-MM-DD HH:mm:ss" />
                        </div>

                        {/* Special Instructions */}
                        <div className="md:col-span-2 pt-3 mt-2 border-t border-gray-100">
                            <label htmlFor="booking-special_instructions">Special Instructions</label>
                            <textarea id="booking-special_instructions" name="special_instructions" value={form.special_instructions} onChange={handleChange} placeholder="Any special requirements or notes..." />
                        </div>
                    </div>

                    {/* Pricing Calculator */}
                    {duration > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-4">
                                <CreditCard className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" />
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pricing Calculation</span>
                            </div>
                            <PricingCard
                                duration={duration}
                                onPlanSelect={handlePlanSelect}
                                selectedPlan={selectedPricingPlan}
                            />
                        </div>
                    )}

                    {/* Footer */}
                    <div className="form-footer">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[#0d9488] transition-colors flex items-center gap-2 disabled:opacity-50">
                            {loading && <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />}
                            {loading ? 'Creating...' : 'Create Booking'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
