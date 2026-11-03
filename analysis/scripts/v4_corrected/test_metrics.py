import unittest
import numpy as np
from metrics import weights, calibration, censor_km

class HorizonTests(unittest.TestCase):
    def test_nine_time_status_combinations(self):
        t = np.repeat([9., 10., 11.], 3)
        e = np.tile([0, 1, 2], 3)
        complete = (t == 10) & (e == 0)
        y, w = weights(t, e, 10, train=(np.array([20.]*4), np.zeros(4)), complete_at_h=complete)
        np.testing.assert_array_equal(y, [0,1,0,0,1,0,0,0,0])
        np.testing.assert_array_equal(w, [0,1,1,1,1,1,1,1,1])
    def test_unverified_censor_at_horizon_not_assumed_known(self):
        _, w = weights([9,10,11], [1,0,0], 10)
        self.assertEqual(w[1], 0)
    def test_invalid_admin_flag(self):
        with self.assertRaises(ValueError): weights([9], [0], 10, complete_at_h=[True])
    def test_training_only_censor_distribution(self):
        y,w=weights([5,10,11],[1,0,0],10,train=(np.array([2,20,20,20]),np.array([0,0,0,0])),complete_at_h=[False,True,False])
        np.testing.assert_allclose(w,[4/3,4/3,4/3])
    def test_reverse_km_ties(self):
        g=censor_km([5,5,10,12],[1,0,2,0])
        self.assertEqual(g(5,left=True),1)
        self.assertAlmostEqual(g(5),2/3)
    def test_competing_event_is_control(self):
        y,w=weights([5,11],[2,0],10)
        np.testing.assert_array_equal(y,[0,0]);np.testing.assert_array_equal(w,[1,1])
    def test_perfect_calibration(self):
        p=np.repeat([.1,.2,.5,.8,.9],100)
        y=np.concatenate([np.r_[np.ones(k),np.zeros(100-k)] for k in [10,20,50,80,90]])
        s,a,_=calibration(y,p,np.ones(len(p)))
        self.assertAlmostEqual(s,1,places=6);self.assertAlmostEqual(a,0,places=6)
    def test_complete_data_brier(self):
        y,w=weights([5,6,12,10],[1,2,0,0],10,complete_at_h=[False,False,False,True])
        p=np.array([.8,.1,.2,.3])
        self.assertAlmostEqual(np.mean(w*(y-p)**2),np.mean((np.array([1,0,0,0])-p)**2))
    def test_reference_nine_case_fixture(self):
        from sklearn.metrics import roc_auc_score
        t=np.repeat([9.,10.,11.],3);e=np.tile([0,1,2],3)
        p=np.array([.2,.7,.1,.2,.7,.1,.2,.2,.2])
        y,w=weights(t,e,10,complete_at_h=(t==10)&(e==0));v=w>0
        # Independently produced with riskRegression 2026.3.11.
        self.assertAlmostEqual(np.mean(w*(p-y)**2),.0448148148148148,places=12)
        self.assertAlmostEqual(roc_auc_score(y[v],p[v],sample_weight=w[v]),1.)

if __name__=='__main__': unittest.main()
