import Marquee from '../common/Marquee'
import Reveal from '../common/Reveal'
import {
  AddItemButton,
  EditableImage,
  EditableLink,
  EditableText,
  ListItem,
  useField,
} from '../editable'
import useContent from '../../hooks/useContent'
import { cx, img } from '../../utils/helpers'

const SHAPES = ['shape_01', 'shape_02', 'shape_03']

export const defaultData = {
  subtitle: 'Change Starts With You',
  title: 'Be The Light In Someone’s Darkness',
  text: 'Donate, volunteer, and stand up for those who need your support today.',
  cta: { label: 'Donation Now', to: '/#causes' },
  avatars: [{ image: 'img_01.jpg' }, { image: 'img_02.jpg' }, { image: 'img_03.jpg' }],
  avatarsText: 'Join 15000+ global partners who’ve reached',
  gallery: [
    { image: 'img_06.jpg' },
    { image: 'img_10.jpg' },
    { image: 'img_14.jpg' },
    { image: 'img_07.jpg' },
    { image: 'img_11.jpg' },
    { image: 'img_15.jpg' },
    { image: 'img_08.jpg' },
    { image: 'img_12.jpg' },
    { image: 'img_16.jpg' },
  ],
  badge: 'Join 1000+ People Donation',
}

export default function HeroSection() {
  const { editMode } = useContent()
  const { value: avatars = [] } = useField('avatars')
  const { value: gallery = [] } = useField('gallery')

  const columns = [[], [], []]
  gallery.forEach((_, index) => {
    columns[index % 3].push(index)
  })

  return (
    <div className="hero-banner-one header-space-fix position-relative z-1 pt-140 lg-pt-120 sm-pt-90 pb-170 xl-pb-120 md-pb-100 sm-pb-70">
      <div className="box-layout-one">
        <div className="row">
          <div className="col-xl-5 col-md-6">
            <Reveal className="slogan font-amita fs-20" anim="slide-up" duration={900}>
              <EditableText field="subtitle" />
            </Reveal>
            <Reveal
              as="h1"
              className="hero-heading"
              anim="slide-up"
              duration={900}
              delay={300}
            >
              <EditableText field="title" />
            </Reveal>
            <Reveal as="p" className="fs-20" anim="slide-up" duration={900} delay={500}>
              <EditableText field="text" />
            </Reveal>
            <Reveal className="mt-35" anim="slide-up" duration={900} delay={700}>
              <EditableLink field="cta" className="btn-one" />
            </Reveal>
            <Reveal className="avatar-group mt-35" anim="slide-up" duration={900} delay={900}>
              <ul className="style-none d-flex align-items-center">
                {avatars.map((avatar, index) => (
                  <ListItem key={index} field="avatars" index={index}>
                    <li>
                      <EditableImage field="image" alt="" className="avatar rounded-circle" />
                    </li>
                  </ListItem>
                ))}
                <li className="fs-20">
                  <EditableText field="avatarsText" />
                </li>
              </ul>
              <AddItemButton field="avatars" />
            </Reveal>
            {/* /.avatar-group */}
          </div>
        </div>

        <Reveal className="media-wrapper" anim="slide-left" duration={900} delay={500}>
          <div className="hero-marquee">
            <div className="hero-marquee__tilt">
              {columns.map((items, col) => (
                <Marquee
                  key={col}
                  vertical
                  pauseOnHover
                  reverse={col === 1}
                  duration={col === 1 ? 34 : 28}
                  gap={20}
                  paused={editMode}
                  className={cx('hero-marquee__col', col === 2 && 'd-none d-sm-flex')}
                >
                  {items.map((index) => (
                    <ListItem key={index} field="gallery" index={index}>
                      <figure className="hero-tile">
                        <EditableImage field="image" alt="" />
                      </figure>
                    </ListItem>
                  ))}
                </Marquee>
              ))}
            </div>
          </div>
          {editMode && <AddItemButton field="gallery" label="+ Add photo" />}
          <div className="card-wrapper d-flex align-items-center">
            <div className="icon rounded-circle d-flex align-items-center justify-content-center">
              <i className="fa-solid fa-arrow-up-right"></i>
            </div>
            <p className="font-amita">
              <EditableText field="badge" />
            </p>
          </div>
          {/* /.card-wrapper */}
          {SHAPES.map((shape) => (
            <img key={shape} src={img(`${shape}.png`)} alt="" className={`shapes ${shape}`} />
          ))}
        </Reveal>
        {/* /.media-wrapper */}
      </div>
    </div>
  )
}
